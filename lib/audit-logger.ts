import { type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GDPR Article 30: Records of Processing
 * Centralized audit logging for all data-modifying operations
 */

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'member_add'
  | 'member_remove'
  | 'permission_change';

export interface AuditLogEntry {
  workspaceId: string;
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Extract IP address from request headers
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (
    (
      forwarded?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      ''
    ).trim() || 'unknown'
  );
}

/**
 * Log an audit event to the audit_log table
 * Uses service role to bypass RLS and ensure logging always succeeds
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    );

    await supabaseAdmin.from('audit_log').insert({
      workspace_id: entry.workspaceId,
      user_id: entry.userId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log to console but don't throw - audit logging should never break the main operation
    console.error('Audit logging failed:', error);
  }
}

/**
 * Log multiple audit events in batch
 */
export async function logAuditEventsBatch(
  entries: AuditLogEntry[]
): Promise<void> {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    );

    const formattedEntries = entries.map((e) => ({
      workspace_id: e.workspaceId,
      user_id: e.userId || null,
      action: e.action,
      resource_type: e.resourceType,
      resource_id: e.resourceId || null,
      details: e.details || {},
      ip_address: e.ipAddress || null,
      user_agent: e.userAgent || null,
      created_at: new Date().toISOString(),
    }));

    await supabaseAdmin.from('audit_log').insert(formattedEntries);
  } catch (error) {
    console.error('Batch audit logging failed:', error);
  }
}

/**
 * Extract audit context from request and authenticated user
 * Returns base context object that can be extended with additional details
 */
export async function getAuditContext(
  request: NextRequest,
  userId?: string
): Promise<{
  ipAddress: string;
  userAgent: string;
  userId: string | undefined;
}> {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    userId,
  };
}

/**
 * Convenience wrapper for logging a create operation
 */
export async function logCreate(
  workspaceId: string,
  resourceType: string,
  resourceId: string,
  userId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    action: 'create',
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  });
}

/**
 * Convenience wrapper for logging an update operation
 */
export async function logUpdate(
  workspaceId: string,
  resourceType: string,
  resourceId: string,
  userId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    action: 'update',
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  });
}

/**
 * Convenience wrapper for logging a delete operation
 */
export async function logDelete(
  workspaceId: string,
  resourceType: string,
  resourceId: string,
  userId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    action: 'delete',
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  });
}

/**
 * Convenience wrapper for logging member operations
 */
export async function logMemberOperation(
  workspaceId: string,
  action: 'member_add' | 'member_remove' | 'permission_change',
  userId?: string,
  targetUserId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    workspaceId,
    userId,
    action,
    resourceType: 'workspace_member',
    resourceId: targetUserId,
    details: {
      ...details,
      targetUserId,
    },
    ipAddress,
    userAgent,
  });
}
