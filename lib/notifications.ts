import { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType =
  | 'deadline_reminder'
  | 'evidence_rejected'
  | 'evidence_approved'
  | 'plan_completed'
  | 'member_added'
  | 'assessment_completed';

export type NotificationEntityType =
  | 'remediation_plan'
  | 'evidence'
  | 'risk_assessment'
  | 'workspace_member'
  | 'obligation';

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  entity_type?: NotificationEntityType;
  entity_id?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

export async function createNotification(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  type: NotificationType,
  title: string,
  options?: {
    message?: string;
    entityType?: NotificationEntityType;
    entityId?: string;
    actionUrl?: string;
  }
) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      type,
      title,
      message: options?.message,
      entity_type: options?.entityType,
      entity_id: options?.entityId,
      action_url: options?.actionUrl,
    });

  if (error) {
    console.error('[notifications] failed to create notification:', error);
  }
}

export async function createNotificationsForTeam(
  supabase: SupabaseClient,
  workspaceId: string,
  excludeUserId: string | null,
  type: NotificationType,
  title: string,
  options?: {
    message?: string;
    entityType?: NotificationEntityType;
    entityId?: string;
    actionUrl?: string;
  }
) {
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (!members) return;

  const notifications = members
    .filter(m => !excludeUserId || m.user_id !== excludeUserId)
    .map(m => ({
      workspace_id: workspaceId,
      user_id: m.user_id,
      type,
      title,
      message: options?.message,
      entity_type: options?.entityType,
      entity_id: options?.entityId,
      action_url: options?.actionUrl,
    }));

  if (notifications.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('[notifications] failed to create team notifications:', error);
    }
  }
}

export function getNotificationDescription(type: NotificationType, title: string): string {
  const descriptions: Record<NotificationType, string> = {
    deadline_reminder: `Deadline reminder: ${title}`,
    evidence_rejected: `Evidence rejected: ${title}`,
    evidence_approved: `Evidence approved: ${title}`,
    plan_completed: `Plan completed: ${title}`,
    member_added: `${title} was added to your workspace`,
    assessment_completed: `Assessment completed: ${title}`,
  };

  return descriptions[type] || title;
}
