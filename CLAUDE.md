# CLAUDE.md — Karate Events

Cross-platform event-organizing app. First use case: running a karate competition
where an admin calls students to courts and parents/coaches get notified in real time.
Designed to generalize to other sports/events later.

## Stack

- App (web + iOS + Android from one codebase): Expo (React Native) + expo-router
- Language: TypeScript (strict). Never use plain JS for new files.
- Backend / DB / Auth / Realtime: Supabase (free tier). Postgres + Row-Level Security.
- Excel import: SheetJS (`xlsx`), parsed client-side.
- Push notifications: Expo Push Notifications.
- Testing: Jest + React Native Testing Library.
- Deploy: web → Vercel; mobile → Expo EAS build.

## Commands

- Start dev server: `npx expo start` (press `w` for web, scan QR for device)
- Run tests: `npm test`
- Run a single test: `npm test -- <path>`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`

## Roles (stored on `profiles.role`)

- admin: creates events, uploads court-assignment Excel
- referee: calls students to courts
- coach: sees their students' call status, gets notified
- parent: sees their child's call status, gets notified
- student: (optional) sees own call status
  Enforce role permissions with Supabase RLS policies, not just UI gating.

## Data model (core tables)

- profiles(id, role, expo_push_token, ...)
- events(id, name, date, created_by)
- students(id, name, parent_id, ...)
- registrations(id, event_id, student_id)
- courts(id, event_id, name)
- court_assignments(id, event_id, court_id, student_id) -- populated from Excel
- call_queue(id, event_id, court_id, student_id, status, called_at) -- admin "call next" writes here; Realtime broadcasts to parent/coach

## Conventions

- Write a test alongside every non-trivial function, especially the Excel parser,
  call-queue logic, and RLS auth guards. Pure functions get thorough unit tests.
- Validate Excel columns and show a preview before committing an import.
- Keep secrets in env vars; never commit keys or .env files.
- Prefer small, reviewable changes. Explain the plan before writing code.

## Out of scope for v1 (do NOT build yet)

- AdMob ads, multi-sport generalization, SMS fallback, payments.
  These are phase 2, after the July 17 ship date.

## Workflow notes

- Use Plan Mode for any multi-file change: propose the approach, wait for approval, then implement.
- When corrected, add a rule to this file so the mistake doesn't repeat.
