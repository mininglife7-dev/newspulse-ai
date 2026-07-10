/**
 * Shared types for EURO AI.
 * Re-exports the canonical types defined alongside their data layer.
 */

export type { AuthUser } from '@/lib/auth';

// ----- API contract types -----

export interface HealthResponse {
  ok: boolean;
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime_s: number | null;
  checks: {
    supabase_url: boolean;
    supabase_anon: boolean;
    supabase_service: boolean;
  };
}
