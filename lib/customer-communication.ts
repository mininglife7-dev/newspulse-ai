/**
 * DNS-018: Customer Communication Bridge
 *
 * Automatically notify affected customers during incidents with clear, timely communication.
 * Bridges incident detection (DNS-001-004, 008-009, DNS-017) with customer-facing visibility
 * to minimize uncertainty and maintain trust during service disruptions.
 */

export type NotificationChannel = 'email' | 'sms' | 'status-page' | 'in-app' | 'slack' | 'webhook';

export type NotificationSeverity = 'informational' | 'warning' | 'critical';

export type NotificationStatus = 'drafted' | 'queued' | 'sent' | 'delivered' | 'failed';

export type IncidentPhase = 'detected' | 'investigating' | 'identified' | 'mitigating' | 'recovering' | 'resolved';

export interface AffectedCustomer {
  customerId: string;
  email: string;
  name: string;
  affectedServices: string[];
  preferredChannels: NotificationChannel[];
  language?: string;
  isVIP?: boolean;
}

export interface NotificationTemplate {
  id: string;
  severity: NotificationSeverity;
  phase: IncidentPhase;
  subject: string;
  body: string;
  actionUrl?: string;
}

export interface CommunicationLog {
  id: string;
  timestamp: string;
  incidentId: string;
  customerId: string;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  phase: IncidentPhase;
  subject: string;
  messageBody: string;
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  customersReached: number;
}

export interface CustomerImpactSummary {
  totalCustomersAffected: number;
  criticalCustomers: number;
  notificationsSent: number;
  notificationsDelivered: number;
  deliveryRate: number;
  channelBreakdown: Record<NotificationChannel, number>;
  averageDeliveryTime: number; // seconds
}

// In-memory communication log
const communicationLog: CommunicationLog[] = [];
const notificationTemplates = new Map<string, NotificationTemplate>();

// Default notification templates
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'critical-detected',
    severity: 'critical',
    phase: 'detected',
    subject: '🚨 Service Alert: {{serviceName}} Impact Detected',
    body: 'We have detected an issue affecting {{serviceName}}. Our engineering team is investigating. Estimated resolution: {{estimatedTime}}. We will provide updates every 15 minutes.',
  },
  {
    id: 'critical-investigating',
    severity: 'critical',
    phase: 'investigating',
    subject: '🔍 Service Alert Update: {{serviceName}} Investigation Ongoing',
    body: 'We are actively investigating the issue with {{serviceName}}. {{affectedUserCount}} users are affected. Expected impact: {{expectedDuration}}. We are prioritizing quick resolution.',
  },
  {
    id: 'critical-identified',
    severity: 'critical',
    phase: 'identified',
    subject: '🔧 Root Cause Identified: {{serviceName}} Incident',
    body: 'We have identified the root cause of the {{serviceName}} outage: {{rootCause}}. Mitigation in progress. Estimated recovery: {{estimatedRecovery}}.',
  },
  {
    id: 'critical-mitigating',
    severity: 'critical',
    phase: 'mitigating',
    subject: '⚙️ Service Alert: Mitigation in Progress',
    body: 'Our team is actively working to restore {{serviceName}}. Mitigation status: {{mitigationStatus}}. We expect service restoration in {{estimatedTime}}.',
  },
  {
    id: 'warning-resolved',
    severity: 'warning',
    phase: 'resolved',
    subject: '✅ Service Restored: {{serviceName}} Back to Normal',
    body: 'We have successfully resolved the issue with {{serviceName}}. All services are operating normally. Thank you for your patience. Post-mortem analysis will be shared by {{postMortemDate}}.',
  },
  {
    id: 'informational-status',
    severity: 'informational',
    phase: 'investigating',
    subject: 'ℹ️ Service Update: {{serviceName}} Status',
    body: 'We want to keep you informed about the ongoing {{serviceName}} incident. Current status: {{currentStatus}}. No action required from your end.',
  },
];

DEFAULT_TEMPLATES.forEach((template) => {
  notificationTemplates.set(template.id, template);
});

/**
 * Determine which customers are affected by an incident
 */
export function identifyAffectedCustomers(
  affectedServices: string[],
  allCustomers: AffectedCustomer[]
): AffectedCustomer[] {
  return allCustomers.filter((customer) =>
    customer.affectedServices.some((service) => affectedServices.includes(service))
  );
}

/**
 * Select notification template based on incident phase and severity
 */
export function selectTemplate(
  phase: IncidentPhase,
  severity: NotificationSeverity
): NotificationTemplate | undefined {
  // Find template matching phase and severity
  for (const [, template] of notificationTemplates) {
    if (template.phase === phase && template.severity === severity) {
      return template;
    }
  }
  // Fallback to informational status if exact match not found
  return notificationTemplates.get('informational-status');
}

/**
 * Render notification message with incident context
 */
export function renderNotification(
  template: NotificationTemplate,
  context: Record<string, string | number>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  // Replace placeholders
  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    body = body.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return { subject, body };
}

/**
 * Select notification channels based on customer preference and severity
 */
export function selectChannels(
  customer: AffectedCustomer,
  severity: NotificationSeverity
): NotificationChannel[] {
  if (severity === 'critical' && customer.isVIP) {
    // VIP customers during critical incidents get all channels
    return ['email', 'sms', 'in-app', 'slack'];
  }

  if (severity === 'critical') {
    // Critical incidents: use email + in-app minimum, plus any customer preferences
    const criticalChannels = new Set(['email', 'in-app']);
    customer.preferredChannels.forEach((ch) => criticalChannels.add(ch));
    return Array.from(criticalChannels) as NotificationChannel[];
  }

  // Warning/informational: respect customer preference
  return customer.preferredChannels.slice(0, 2);
}

/**
 * Log communication attempt
 */
export function logCommunication(
  incidentId: string,
  customer: AffectedCustomer,
  channel: NotificationChannel,
  severity: NotificationSeverity,
  phase: IncidentPhase,
  notification: { subject: string; body: string },
  status: NotificationStatus = 'queued'
): CommunicationLog {
  const log: CommunicationLog = {
    id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    incidentId,
    customerId: customer.customerId,
    channel,
    severity,
    phase,
    subject: notification.subject,
    messageBody: notification.body,
    status,
    customersReached: 1,
  };

  communicationLog.push(log);
  return log;
}

/**
 * Mark communication as delivered
 */
export function markDelivered(communicationId: string): CommunicationLog | undefined {
  const entry = communicationLog.find((log) => log.id === communicationId);
  if (entry) {
    entry.status = 'delivered';
    entry.deliveredAt = new Date().toISOString();
  }
  return entry;
}

/**
 * Mark communication as failed
 */
export function markFailed(communicationId: string, reason: string): CommunicationLog | undefined {
  const entry = communicationLog.find((log) => log.id === communicationId);
  if (entry) {
    entry.status = 'failed';
    entry.failureReason = reason;
  }
  return entry;
}

/**
 * Get all communications for an incident
 */
export function getIncidentCommunications(incidentId: string): CommunicationLog[] {
  return communicationLog.filter((log) => log.incidentId === incidentId);
}

/**
 * Calculate customer communication impact metrics
 */
export function calculateCommunicationMetrics(incidentId: string): CustomerImpactSummary {
  const incidentComms = getIncidentCommunications(incidentId);

  const totalCustomersAffected = new Set(incidentComms.map((c) => c.customerId)).size;
  const criticalCount = incidentComms.filter((c) => c.severity === 'critical').length;
  const notificationsSent = incidentComms.filter((c) => c.status !== 'drafted').length;
  const deliveredCount = incidentComms.filter((c) => c.status === 'delivered').length;
  const deliveryRate = notificationsSent > 0 ? Math.round((deliveredCount / notificationsSent) * 100) : 0;

  // Channel breakdown
  const channelBreakdown: Record<NotificationChannel, number> = {
    email: 0,
    sms: 0,
    'status-page': 0,
    'in-app': 0,
    slack: 0,
    webhook: 0,
  };

  incidentComms.forEach((c) => {
    channelBreakdown[c.channel]++;
  });

  // Average delivery time
  const deliveredComms = incidentComms.filter((c) => c.deliveredAt);
  const totalDeliveryTime = deliveredComms.reduce((sum, c) => {
    const sent = new Date(c.sentAt || c.timestamp).getTime();
    const delivered = new Date(c.deliveredAt!).getTime();
    return sum + (delivered - sent) / 1000; // seconds
  }, 0);
  const averageDeliveryTime =
    deliveredComms.length > 0 ? Math.round(totalDeliveryTime / deliveredComms.length) : 0;

  return {
    totalCustomersAffected,
    criticalCustomers: criticalCount,
    notificationsSent,
    notificationsDelivered: deliveredCount,
    deliveryRate,
    channelBreakdown,
    averageDeliveryTime,
  };
}

/**
 * Register custom notification template
 */
export function registerTemplate(template: NotificationTemplate): void {
  notificationTemplates.set(template.id, template);
}

/**
 * Get notification template by ID
 */
export function getTemplate(templateId: string): NotificationTemplate | undefined {
  return notificationTemplates.get(templateId);
}

/**
 * Format customer communication report
 */
export function formatCommunicationReport(incidentId: string, metrics: CustomerImpactSummary): string {
  const lines = [
    '# Customer Communication Report',
    '',
    `**Incident ID:** ${incidentId}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Communication Summary',
    `- **Total Customers Affected:** ${metrics.totalCustomersAffected}`,
    `- **Critical Notifications:** ${metrics.criticalCustomers}`,
    `- **Notifications Sent:** ${metrics.notificationsSent}`,
    `- **Notifications Delivered:** ${metrics.notificationsDelivered}`,
    `- **Delivery Rate:** ${metrics.deliveryRate}%`,
    `- **Avg Delivery Time:** ${metrics.averageDeliveryTime}s`,
    '',
    '## Channel Breakdown',
  ];

  for (const [channel, count] of Object.entries(metrics.channelBreakdown)) {
    if (count > 0) {
      lines.push(`- **${channel}:** ${count} notifications`);
    }
  }

  lines.push('');
  lines.push('## Notifications Sent');

  const incidentComms = getIncidentCommunications(incidentId);
  incidentComms.slice(-10).forEach((comm) => {
    const statusEmoji = comm.status === 'delivered' ? '✓' : comm.status === 'failed' ? '✗' : '⏳';
    lines.push(
      `${statusEmoji} [${comm.channel}] ${comm.subject} (${comm.severity.toUpperCase()}) - ${comm.status}`
    );
  });

  return lines.join('\n');
}

/**
 * Reset communication log (testing/admin only)
 */
export function resetCommunicationLog(): void {
  communicationLog.length = 0;
}

/**
 * Simulate sending notification via channel
 */
export function simulateSendNotification(
  log: CommunicationLog
): { success: boolean; deliveryTime: number } {
  const randomDelay = Math.random() * 5000; // 0-5 seconds

  // 95% success rate for simulation
  const success = Math.random() > 0.05;

  if (success) {
    markDelivered(log.id);
    log.sentAt = new Date().toISOString();
    return { success: true, deliveryTime: randomDelay };
  } else {
    markFailed(log.id, 'Simulated delivery failure');
    log.sentAt = new Date().toISOString();
    return { success: false, deliveryTime: 0 };
  }
}
