export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'referee' | 'coach' | 'parent';
export type CallStatus = 'waiting' | 'called' | 'acknowledged' | 'done' | 'skipped';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          expo_push_token: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          expo_push_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          expo_push_token?: string | null;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          name: string;
          date: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          created_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          student_id?: string;
          created_at?: string;
        };
      };
      courts: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      court_assignments: {
        Row: {
          id: string;
          event_id: string;
          court_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          court_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          court_id?: string;
          student_id?: string;
          created_at?: string;
        };
      };
      call_queue: {
        Row: {
          id: string;
          event_id: string;
          court_id: string;
          student_id: string;
          status: CallStatus;
          called_at: string;
          called_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          court_id: string;
          student_id: string;
          status?: CallStatus;
          called_at?: string;
          called_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          court_id?: string;
          student_id?: string;
          status?: CallStatus;
          called_at?: string;
          called_by?: string | null;
          created_at?: string;
        };
      };
      coach_students: {
        Row: {
          coach_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          coach_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          coach_id?: string;
          student_id?: string;
          created_at?: string;
        };
      };
      event_referees: {
        Row: {
          event_id: string;
          referee_id: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          referee_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          referee_id?: string;
          created_at?: string;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      call_status: CallStatus;
    };
  };
}
