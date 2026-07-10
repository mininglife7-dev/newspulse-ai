import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Admin/Service Role Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
 * Use only for:
 * - Cron jobs that need to write across all workspaces
 * - System-level operations that should bypass user-level RLS
 * NEVER use for user-facing requests (use createRouteClient instead).
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
