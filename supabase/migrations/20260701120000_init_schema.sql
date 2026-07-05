-- ============================================================================
-- karate-events — initial schema + Row-Level Security
-- ----------------------------------------------------------------------------
-- Core tables from CLAUDE.md with foreign keys, plus RLS for the four v1 roles:
--   admin, referee, coach, parent.
-- RLS is the real enforcement layer (UI gating is cosmetic) and doubles as the
-- Realtime broadcast filter for call_queue.
--
-- Bootstrapping note: the first admin cannot self-insert as 'admin' (RLS blocks
-- privilege self-assignment). Provision it out-of-band via the service role,
-- which bypasses RLS, then that admin manages everyone else.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Extensions
-- --------------------------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'referee', 'coach', 'parent');
create type public.call_status as enum ('waiting', 'called', 'acknowledged', 'done', 'skipped');

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null default 'parent',
  full_name       text,
  phone           text,  -- mirrors auth.users.phone for phone-based login
  expo_push_token text,
  created_at      timestamptz not null default now()
);

create table public.events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  date       date not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- nullable: a student may have no parent account
  parent_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.registrations (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, student_id)
);

create table public.courts (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

-- populated from the Excel import
create table public.court_assignments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  court_id   uuid not null references public.courts (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, court_id, student_id)
);

-- admin/referee "call next" writes here; Realtime broadcasts to parents/coaches
create table public.call_queue (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  court_id   uuid not null references public.courts (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status     public.call_status not null default 'called',
  called_at  timestamptz not null default now(),
  called_by  uuid references public.profiles (id) on delete set null,  -- audit
  created_at timestamptz not null default now()
);

-- coach <-> student link (many-to-many); admin-managed
create table public.coach_students (
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, student_id)
);

-- referee <-> event assignment; scopes what a referee may act on
create table public.event_referees (
  event_id   uuid not null references public.events (id) on delete cascade,
  referee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, referee_id)
);

-- --------------------------------------------------------------------------
-- Indexes on FK columns used inside policy lookups
-- --------------------------------------------------------------------------
create index idx_court_assignments_student on public.court_assignments (student_id);
create index idx_court_assignments_event   on public.court_assignments (event_id);
create index idx_call_queue_event          on public.call_queue (event_id);
create index idx_call_queue_student        on public.call_queue (student_id);
create index idx_coach_students_student    on public.coach_students (student_id);
create index idx_event_referees_referee    on public.event_referees (referee_id);

-- phone-based login: phone must be unique when present (NULLs allowed)
create unique index idx_profiles_phone on public.profiles (phone);

-- --------------------------------------------------------------------------
-- Helper functions
--   SECURITY DEFINER so policies can read role/relationship rows without
--   recursing through RLS (a profiles policy that reads profiles). STABLE +
--   empty search_path (everything fully schema-qualified) per Supabase guidance.
--   Named auth_role() rather than current_role() to avoid shadowing the
--   built-in SQL current_role.
-- --------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.auth_role() = 'admin';
$$;

create or replace function public.is_referee_for_event(e uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_referees er
    where er.event_id = e
      and er.referee_id = (select auth.uid())
  );
$$;

-- true if the caller may see this student: admin, the student's parent, a linked
-- coach, or a referee assigned to an event the student is court-assigned to.
create or replace function public.can_see_student(s uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.students st
      where st.id = s and st.parent_id = (select auth.uid())
    )
    or exists (
      select 1 from public.coach_students cs
      where cs.student_id = s and cs.coach_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.court_assignments ca
      join public.event_referees er on er.event_id = ca.event_id
      where ca.student_id = s
        and er.referee_id = (select auth.uid())
    );
$$;

-- Block role self-escalation on UPDATE (INSERT is guarded in the policy below).
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only admins can change a profile role';
  end if;
  return new;
end;
$$;

create trigger profiles_no_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- --------------------------------------------------------------------------
-- Enable RLS
-- --------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.events            enable row level security;
alter table public.students          enable row level security;
alter table public.registrations     enable row level security;
alter table public.courts            enable row level security;
alter table public.court_assignments enable row level security;
alter table public.call_queue        enable row level security;
alter table public.coach_students    enable row level security;
alter table public.event_referees    enable row level security;

-- --------------------------------------------------------------------------
-- Policies  (all scoped to the authenticated role; anon gets nothing)
-- --------------------------------------------------------------------------

-- profiles ----------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- self-registration: own row only, and non-admins may not self-assign a
-- privileged role (role change afterwards is blocked by the trigger)
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and (role = 'parent' or public.is_admin())
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- events ------------------------------------------------------------------
create policy events_select on public.events
  for select to authenticated
  using (true);

create policy events_insert on public.events
  for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_admin());

create policy events_update on public.events
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy events_delete on public.events
  for delete to authenticated
  using (public.is_admin());

-- students ----------------------------------------------------------------
create policy students_select on public.students
  for select to authenticated
  using (public.can_see_student(id));

create policy students_insert on public.students
  for insert to authenticated
  with check (public.is_admin() or parent_id = (select auth.uid()));

create policy students_update on public.students
  for update to authenticated
  using (public.is_admin() or parent_id = (select auth.uid()))
  with check (public.is_admin() or parent_id = (select auth.uid()));

create policy students_delete on public.students
  for delete to authenticated
  using (public.is_admin());

-- registrations -----------------------------------------------------------
create policy registrations_select on public.registrations
  for select to authenticated
  using (public.is_admin() or public.can_see_student(student_id));

create policy registrations_write on public.registrations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- courts ------------------------------------------------------------------
create policy courts_select on public.courts
  for select to authenticated
  using (true);

create policy courts_write on public.courts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- court_assignments -------------------------------------------------------
create policy court_assignments_select on public.court_assignments
  for select to authenticated
  using (
    public.is_admin()
    or public.is_referee_for_event(event_id)
    or public.can_see_student(student_id)
  );

create policy court_assignments_write on public.court_assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- call_queue --------------------------------------------------------------
create policy call_queue_select on public.call_queue
  for select to authenticated
  using (
    public.is_admin()
    or public.is_referee_for_event(event_id)
    or public.can_see_student(student_id)
  );

-- "call next" + status transitions: admin or a referee assigned to the event
create policy call_queue_insert on public.call_queue
  for insert to authenticated
  with check (public.is_admin() or public.is_referee_for_event(event_id));

create policy call_queue_update on public.call_queue
  for update to authenticated
  using (public.is_admin() or public.is_referee_for_event(event_id))
  with check (public.is_admin() or public.is_referee_for_event(event_id));

create policy call_queue_delete on public.call_queue
  for delete to authenticated
  using (public.is_admin());

-- coach_students ----------------------------------------------------------
create policy coach_students_select on public.coach_students
  for select to authenticated
  using (public.is_admin() or coach_id = (select auth.uid()));

create policy coach_students_write on public.coach_students
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- event_referees ----------------------------------------------------------
create policy event_referees_select on public.event_referees
  for select to authenticated
  using (public.is_admin() or referee_id = (select auth.uid()));

create policy event_referees_write on public.event_referees
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------------------------
-- Table privileges (RLS applies on top of these). Harmless if Supabase
-- default privileges already granted them.
-- --------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- --------------------------------------------------------------------------
-- Realtime: publish call_queue so parents/coaches get live call events.
-- RLS SELECT policies scope each subscriber's stream. Guarded for non-Supabase
-- Postgres where the publication may not exist.
-- --------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.call_queue;
  end if;
end $$;
