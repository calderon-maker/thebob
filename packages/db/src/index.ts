/**
 * Tipos compartilhados do banco do thebob.
 *
 * Após rodar a primeira migration no Supabase, regenere:
 *   pnpm --filter @thebob/db gen:types
 *
 * Isso vai sobrescrever `database.types.ts` com o schema real.
 * Por enquanto, exportamos o tipo `Database` mínimo para o web e o pipeline
 * compilar antes do projeto Supabase existir.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Tipo placeholder. Após `pnpm gen:types`, importar de ./database.types.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'member' | 'aspiring' | 'watching' | 'hall_of_fame';
          segment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'member' | 'aspiring' | 'watching' | 'hall_of_fame';
          segment?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      prospects: {
        Row: {
          id: number;
          full_name: string;
          email: string;
          linkedin_url: string;
          segment: string;
          consent: boolean;
          source: string;
          user_agent: string | null;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['prospects']['Row'], 'id' | 'created_at'> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prospects']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
          current_period_end: string | null;
          tier: 'member_monthly' | 'member_yearly' | 'aspiring_monthly';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']> & {
          user_id: string;
          status: Database['public']['Tables']['subscriptions']['Row']['status'];
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
      events: {
        Row: {
          id: number;
          user_id: string | null;
          type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          type: string;
          payload?: Json;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      audit_log: {
        Row: {
          id: number;
          actor: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          diff: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      jobs: {
        Row: {
          id: number;
          type: string;
          payload: Json;
          status: 'pending' | 'running' | 'done' | 'failed';
          attempts: number;
          last_error: string | null;
          scheduled_for: string;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          type: string;
          payload: Json;
          status?: 'pending';
          scheduled_for?: string;
        };
        Update: Partial<Database['public']['Tables']['jobs']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
