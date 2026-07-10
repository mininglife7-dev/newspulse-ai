import { createRouteClient } from '@/lib/supabase-server';

export type AuditActionType =
  | 'assessment_created'
  | 'assessment_finalized'
  | 'assessment_status_changed'
  | 'evidence_submitted'
  | 'evidence_reviewed'
  | 'evidence_approved'
  | 'evidence_rejected'
  | 'plan_created'
  | 'plan_updated'
  | 'plan_status_changed'
  | 'plan_completed'
  | 'obligation_identified'
  | 'obligation_completed'
  | 'member_invited'
  | 'member_role_changed'
  | 'member_removed';

export type AuditEntityType = 'risk_assessment' | 'evidence' | 'remediation_plan' | 'obligation' | 'workspace_member';

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any>;
  created_at: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  supabase: ReturnType<typeof createRouteClient>,
  workspaceId: string,
  userId: string,
  actionType: AuditActionType,
  entityType: AuditEntityType,
  entityId: string | null,
  entityName: string | null,
  details?: Record<string, any>
) {
  try {
    const { error } = await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details: details || {},
    });

    if (error) {
      console.error('[audit-log] failed to log event:', error);
    }
  } catch (err) {
    console.error('[audit-log] unexpected error:', err);
  }
}

/**
 * Get human-readable description of an audit action
 */
export function getActionDescription(actionType: AuditActionType, entityName: string | null): string {
  const descriptions: Record<AuditActionType, string> = {
    assessment_created: `Created risk assessment: ${entityName}`,
    assessment_finalized: `Finalized risk assessment: ${entityName}`,
    assessment_status_changed: `Changed assessment status: ${entityName}`,
    evidence_submitted: `Submitted evidence: ${entityName}`,
    evidence_reviewed: `Started reviewing evidence: ${entityName}`,
    evidence_approved: `Approved evidence: ${entityName}`,
    evidence_rejected: `Rejected evidence: ${entityName}`,
    plan_created: `Created remediation plan: ${entityName}`,
    plan_updated: `Updated remediation plan: ${entityName}`,
    plan_status_changed: `Changed plan status: ${entityName}`,
    plan_completed: `Completed remediation plan: ${entityName}`,
    obligation_identified: `Identified obligation: ${entityName}`,
    obligation_completed: `Completed obligation: ${entityName}`,
    member_invited: `Invited team member: ${entityName}`,
    member_role_changed: `Changed member role: ${entityName}`,
    member_removed: `Removed team member: ${entityName}`,
  };

  return descriptions[actionType] || `${actionType}: ${entityName}`;
}
