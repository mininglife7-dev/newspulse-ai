import { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications';

export interface DeadlineCheckResult {
  checked_at: string;
  obligations_3day: number;
  obligations_1day: number;
  obligations_overdue: number;
  plans_3day: number;
  plans_1day: number;
  plans_overdue: number;
  total_notifications_created: number;
}

export async function checkAndNotifyDeadlines(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<DeadlineCheckResult> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const threeDay = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oneDay = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let totalNotifications = 0;

  // Check obligations approaching deadlines
  const { data: obligationsThreeDay } = await supabase
    .from('obligations')
    .select('id, title, due_date')
    .eq('workspace_id', workspaceId)
    .eq('status', 'in_progress')
    .gte('due_date', today)
    .lte('due_date', threeDay);

  const { data: obligationsOneDay } = await supabase
    .from('obligations')
    .select('id, title, due_date')
    .eq('workspace_id', workspaceId)
    .eq('status', 'in_progress')
    .eq('due_date', oneDay);

  const { data: obligationsOverdue } = await supabase
    .from('obligations')
    .select('id, title, due_date')
    .eq('workspace_id', workspaceId)
    .eq('status', 'in_progress')
    .lt('due_date', today);

  // Check plans approaching deadlines
  const { data: plansThreeDay } = await supabase
    .from('remediation_plans')
    .select('id, title, target_date')
    .eq('workspace_id', workspaceId)
    .in('status', ['planned', 'in_progress'])
    .gte('target_date', today)
    .lte('target_date', threeDay);

  const { data: plansOneDay } = await supabase
    .from('remediation_plans')
    .select('id, title, target_date')
    .eq('workspace_id', workspaceId)
    .in('status', ['planned', 'in_progress'])
    .eq('target_date', oneDay);

  const { data: plansOverdue } = await supabase
    .from('remediation_plans')
    .select('id, title, target_date')
    .eq('workspace_id', workspaceId)
    .in('status', ['planned', 'in_progress'])
    .lt('target_date', today);

  // Get all active members in workspace
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (!members || members.length === 0) {
    return {
      checked_at: new Date().toISOString(),
      obligations_3day: obligationsThreeDay?.length || 0,
      obligations_1day: obligationsOneDay?.length || 0,
      obligations_overdue: obligationsOverdue?.length || 0,
      plans_3day: plansThreeDay?.length || 0,
      plans_1day: plansOneDay?.length || 0,
      plans_overdue: plansOverdue?.length || 0,
      total_notifications_created: 0,
    };
  }

  // Create notifications for each member
  for (const member of members) {
    if (!member.user_id) continue;

    // Overdue obligations
    if (obligationsOverdue && obligationsOverdue.length > 0) {
      for (const obligation of obligationsOverdue) {
        await createNotification(
          supabase,
          workspaceId,
          member.user_id,
          'deadline_reminder',
          `🔴 OVERDUE: ${obligation.title}`,
          {
            message: `Compliance obligation "${obligation.title}" is overdue as of ${obligation.due_date}. Please prioritize completion.`,
            entityType: 'obligation',
            entityId: obligation.id,
            actionUrl: '/compliance',
          }
        );
        totalNotifications++;
      }
    }

    // 1-day obligation reminders
    if (obligationsOneDay && obligationsOneDay.length > 0) {
      for (const obligation of obligationsOneDay) {
        await createNotification(
          supabase,
          workspaceId,
          member.user_id,
          'deadline_reminder',
          `⚠️ DUE TOMORROW: ${obligation.title}`,
          {
            message: `Compliance obligation "${obligation.title}" is due tomorrow (${obligation.due_date}). Action required.`,
            entityType: 'obligation',
            entityId: obligation.id,
            actionUrl: '/compliance',
          }
        );
        totalNotifications++;
      }
    }

    // 3-day obligation reminders
    if (obligationsThreeDay && obligationsThreeDay.length > 0) {
      for (const obligation of obligationsThreeDay) {
        await createNotification(
          supabase,
          workspaceId,
          member.user_id,
          'deadline_reminder',
          `ℹ️ DUE IN 3 DAYS: ${obligation.title}`,
          {
            message: `Compliance obligation "${obligation.title}" is due on ${obligation.due_date}. Please review and plan actions.`,
            entityType: 'obligation',
            entityId: obligation.id,
            actionUrl: '/compliance',
          }
        );
        totalNotifications++;
      }
    }

    // Overdue plans
    if (plansOverdue && plansOverdue.length > 0) {
      for (const plan of plansOverdue) {
        await createNotification(
          supabase,
          workspaceId,
          member.user_id,
          'deadline_reminder',
          `🔴 OVERDUE: ${plan.title}`,
          {
            message: `Remediation plan "${plan.title}" was due on ${plan.target_date}. Please expedite completion.`,
            entityType: 'remediation_plan',
            entityId: plan.id,
            actionUrl: '/compliance',
          }
        );
        totalNotifications++;
      }
    }

    // 1-day plan reminders
    if (plansOneDay && plansOneDay.length > 0) {
      for (const plan of plansOneDay) {
        await createNotification(
          supabase,
          workspaceId,
          member.user_id,
          'deadline_reminder',
          `⚠️ DUE TOMORROW: ${plan.title}`,
          {
            message: `Remediation plan "${plan.title}" is due tomorrow (${plan.target_date}). Final push needed.`,
            entityType: 'remediation_plan',
            entityId: plan.id,
            actionUrl: '/compliance',
          }
        );
        totalNotifications++;
      }
    }

    // 3-day plan reminders
    if (plansThreeDay && plansThreeDay.length > 0) {
      for (const plan of plansThreeDay) {
        await createNotification(
          supabase,
          workspaceId,
          member.user_id,
          'deadline_reminder',
          `ℹ️ DUE IN 3 DAYS: ${plan.title}`,
          {
            message: `Remediation plan "${plan.title}" is due on ${plan.target_date}. Schedule completion activities.`,
            entityType: 'remediation_plan',
            entityId: plan.id,
            actionUrl: '/compliance',
          }
        );
        totalNotifications++;
      }
    }
  }

  return {
    checked_at: new Date().toISOString(),
    obligations_3day: obligationsThreeDay?.length || 0,
    obligations_1day: obligationsOneDay?.length || 0,
    obligations_overdue: obligationsOverdue?.length || 0,
    plans_3day: plansThreeDay?.length || 0,
    plans_1day: plansOneDay?.length || 0,
    plans_overdue: plansOverdue?.length || 0,
    total_notifications_created: totalNotifications,
  };
}
