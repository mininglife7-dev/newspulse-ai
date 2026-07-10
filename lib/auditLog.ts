import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Append-only audit trail for sensitive/destructive actions.
 *
 * Governance products must be able to answer "who did what, when". There are no
 * user accounts yet, so "who" is currently "an admin-token holder", but the
 * action, details and timestamp are recorded so the trail exists from day one.
 *
 * Requires the `audit_log` table (see supabase/schema.sql). Writes are
 * best-effort: recording an audit event must NEVER throw or block the action
 * being audited.
 */

export interface AuditEvent {
  /** Stable machine-readable action key, e.g. "history.clear_all". */
  action: string;
  /** Optional structured context (ids, counts). */
  detail?: Record<string, unknown>;
}

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('audit_log')
      .insert({ action: event.action, detail: event.detail ?? {} });
    if (error) {
      console.error('[audit] insert error:', error.message);
    }
  } catch (err) {
    console.error('[audit] exception:', err);
  }
}
