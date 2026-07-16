/**
 * DNS-028: Founder Alerting System
 *
 * Multi-channel notifications for incident escalation to Founder.
 * Integrates with email (SMTP) and Slack for real-time awareness.
 *
 * Triggered by:
 * - DNS-026: War Games (scenario validation)
 * - DNS-027: Vercel Error Collection (real errors)
 * - Production Wiring: Incident orchestration
 */

import { DetectedIncident } from './incident-detection';
import { OrchestrationDecision } from './incident-orchestration';
import { getEmailService } from './email-service';

// HTML escape user content to prevent injection
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export interface AlertChannel {
  type: 'email' | 'slack';
  enabled: boolean;
  config?: Record<string, string>;
}

export interface AlertPayload {
  incidentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  decision: string;
  estimatedRecoveryTime?: number;
  actionable: boolean;
  timestamp: string;
  dashboardLink: string;
}

export class FounderAlertingSystem {
  private emailEnabled: boolean;
  private slackEnabled: boolean;
  private founderEmail: string | undefined;
  private slackWebhookUrl: string | undefined;
  private alertHistory = new Map<string, Date>();
  private deduplicationWindow = 300000; // 5 minutes

  constructor() {
    this.founderEmail = process.env.FOUNDER_EMAIL;
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.emailEnabled = !!this.founderEmail;
    this.slackEnabled = !!this.slackWebhookUrl;
  }

  /**
   * Alert Founder of critical incident
   */
  async alertCriticalIncident(
    incident: DetectedIncident,
    decision: OrchestrationDecision,
    productionUrl = 'https://newspulse-ai-production.vercel.app'
  ): Promise<{
    emailSent: boolean;
    slackSent: boolean;
    deduped: boolean;
  }> {
    // Check deduplication (avoid spam for same incident)
    const lastAlert = this.alertHistory.get(incident.incidentId);
    const now = Date.now();

    if (lastAlert && now - lastAlert.getTime() < this.deduplicationWindow) {
      return {
        emailSent: false,
        slackSent: false,
        deduped: true,
      };
    }

    const payload: AlertPayload = {
      incidentId: incident.incidentId,
      severity: incident.severity,
      category: incident.category,
      description: incident.description,
      decision: decision.recommendedAction,
      estimatedRecoveryTime: decision.estimatedRecoveryTime,
      actionable: decision.recommendedAction !== 'notify-founder' && !decision.shouldEscalateToFounder,
      timestamp: new Date().toISOString(),
      dashboardLink: `${productionUrl}/dashboard?incident=${incident.incidentId}`,
    };

    let emailSent = false;
    let slackSent = false;

    try {
      // Send email alert
      if (this.emailEnabled && this.founderEmail) {
        emailSent = await this.sendEmailAlert(payload);
      }
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }

    try {
      // Send Slack alert
      if (this.slackEnabled && this.slackWebhookUrl) {
        slackSent = await this.sendSlackAlert(payload);
      }
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }

    // Record alert time for deduplication ONLY if:
    // 1. At least one channel succeeded, OR
    // 2. No channels were enabled (so alert was "sent" via no-op)
    // Prevents dedup trap where failed alerts block retries
    const anyChannelEnabled = this.emailEnabled || this.slackEnabled;
    const shouldRecordDedup = emailSent || slackSent || !anyChannelEnabled;
    if (shouldRecordDedup) {
      this.alertHistory.set(incident.incidentId, new Date());
    }

    return {
      emailSent,
      slackSent,
      deduped: false,
    };
  }

  /**
   * Alert on remediation success/failure
   */
  async alertRemediationOutcome(
    incidentId: string,
    success: boolean,
    recoveryTimeMs: number,
    actionTaken: string,
    lessonLearned?: string
  ): Promise<{ emailSent: boolean; slackSent: boolean }> {
    let emailSent = false;
    let slackSent = false;

    try {
      if (this.emailEnabled && this.founderEmail) {
        const subject = success
          ? `✅ Incident ${incidentId} resolved in ${(recoveryTimeMs / 1000).toFixed(1)}s`
          : `❌ Incident ${incidentId} remediation failed`;

        const escapedAction = escapeHtml(actionTaken);
        const escapedLesson = lessonLearned ? escapeHtml(lessonLearned) : undefined;

        const htmlBody = success
          ? `<h2>✅ Incident Resolved</h2><p><strong>Incident ID:</strong> ${incidentId}</p><p><strong>Recovery Time:</strong> ${(recoveryTimeMs / 1000).toFixed(1)}s</p><p><strong>Action Taken:</strong> ${escapedAction}</p>${escapedLesson ? `<p><strong>Lesson Learned:</strong> ${escapedLesson}</p>` : ''}`
          : `<h2>❌ Remediation Failed</h2><p><strong>Incident ID:</strong> ${incidentId}</p><p><strong>Action Attempted:</strong> ${escapedAction}</p>`;

        emailSent = await this.sendEmail(this.founderEmail, subject, {
          html: htmlBody,
          text: `${subject}\n\nIncident ID: ${incidentId}\nAction: ${actionTaken}${lessonLearned ? `\n\nLesson: ${lessonLearned}` : ''}`,
        });
      }
    } catch (error) {
      console.error('Failed to send remediation email:', error);
    }

    try {
      if (this.slackEnabled && this.slackWebhookUrl) {
        slackSent = await this.sendSlackMessage(this.slackWebhookUrl, {
          text: success
            ? `✅ Incident ${incidentId} resolved`
            : `❌ Incident ${incidentId} remediation failed`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: success
                  ? `*Remediation Successful*\n• Incident: ${incidentId}\n• Recovery time: ${(recoveryTimeMs / 1000).toFixed(1)}s\n• Action: ${actionTaken}`
                  : `*Remediation Failed*\n• Incident: ${incidentId}\n• Action attempted: ${actionTaken}`,
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error('Failed to send Slack remediation message:', error);
    }

    return { emailSent, slackSent };
  }

  /**
   * Alert on repeated pattern (learning/prevention)
   */
  async alertRepeatedPattern(
    fingerprint: string,
    pattern: string,
    occurrenceCount: number,
    suggestedPrevention: string
  ): Promise<{ emailSent: boolean; slackSent: boolean }> {
    const escapedPattern = escapeHtml(pattern);
    const escapedPrevention = escapeHtml(suggestedPrevention);

    const message = `Repeated error pattern detected: ${pattern} (${occurrenceCount} occurrences). Suggested prevention: ${suggestedPrevention}`;

    let emailSent = false;
    let slackSent = false;

    try {
      if (this.emailEnabled && this.founderEmail) {
        const htmlBody = `<h2>⚠️ Repeated Error Pattern Detected</h2><p><strong>Pattern:</strong> ${escapedPattern}</p><p><strong>Fingerprint:</strong> ${fingerprint}</p><p><strong>Occurrences:</strong> ${occurrenceCount}</p><p><strong>Suggested Prevention:</strong> ${escapedPrevention}</p>`;
        emailSent = await this.sendEmail(this.founderEmail, `⚠️ Repeated Error Pattern: ${escapedPattern}`, {
          html: htmlBody,
          text: `Repeated Error Pattern Detected\n\nPattern: ${pattern}\nOccurrences: ${occurrenceCount}\nSuggestion: ${suggestedPrevention}`,
        });
      }
    } catch (error) {
      console.error('Failed to send pattern email:', error);
    }

    try {
      if (this.slackEnabled && this.slackWebhookUrl) {
        slackSent = await this.sendSlackMessage(this.slackWebhookUrl, {
          text: `⚠️ Repeated Error Pattern`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${pattern}*\n• Occurrences: ${occurrenceCount}\n• Suggestion: ${suggestedPrevention}`,
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error('Failed to send Slack pattern message:', error);
    }

    return { emailSent, slackSent };
  }

  /**
   * Send formatted email alert
   */
  private async sendEmailAlert(payload: AlertPayload): Promise<boolean> {
    if (!this.founderEmail) return false;

    const subject =
      payload.severity === 'critical'
        ? `🚨 CRITICAL: ${payload.description}`
        : `⚠️ Alert: ${payload.description}`;

    const htmlBody = `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${payload.severity === 'critical' ? '#dc2626' : '#f59e0b'};">
              ${payload.severity.toUpperCase()}: ${payload.description}
            </h2>

            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Incident ID:</strong> ${payload.incidentId}</p>
              <p><strong>Category:</strong> ${payload.category}</p>
              <p><strong>Detected:</strong> ${payload.timestamp}</p>
              ${payload.estimatedRecoveryTime ? `<p><strong>Est. Recovery:</strong> ${payload.estimatedRecoveryTime}s</p>` : ''}
            </div>

            <div style="background: #e5e7eb; padding: 12px; border-radius: 6px; margin: 16px 0;">
              <p><strong>Decision:</strong> ${payload.decision}</p>
              <p><strong>Status:</strong> ${payload.actionable ? '✅ Automated remediation in progress' : '⏸️ Awaiting manual review'}</p>
            </div>

            <p>
              <a href="${payload.dashboardLink}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Incident Dashboard
              </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated alert from NewsPulse AI incident response system.
            </p>
          </body>
        </html>
      `;

    return await this.sendEmail(this.founderEmail, subject, { html: htmlBody });
  }

  /**
   * Send Slack message
   */
  private async sendSlackMessage(webhookUrl: string, payload: any): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Slack API error:', error);
      return false;
    }
  }

  /**
   * Send Slack incident alert
   */
  private async sendSlackAlert(payload: AlertPayload): Promise<boolean> {
    if (!this.slackWebhookUrl) return false;

    const color = payload.severity === 'critical' ? 'danger' : payload.severity === 'high' ? 'warning' : '#0099ff';

    const message = {
      text: `${payload.severity.toUpperCase()}: ${payload.description}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${payload.severity === 'critical' ? '🚨' : '⚠️'} ${payload.description}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Incident ID*\n${payload.incidentId}`,
            },
            {
              type: 'mrkdwn',
              text: `*Category*\n${payload.category}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity*\n${payload.severity.toUpperCase()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Decision*\n${payload.decision}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Status*: ${payload.actionable ? '✅ Automated remediation in progress' : '⏸️ Awaiting manual review'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Dashboard',
                emoji: true,
              },
              url: payload.dashboardLink,
              action_id: `incident_${payload.incidentId}`,
            },
          ],
        },
      ],
    };

    return await this.sendSlackMessage(this.slackWebhookUrl, message);
  }

  /**
   * Send email via configured provider
   * Supports SendGrid, AWS SES, and console logging (development)
   */
  private async sendEmail(to: string, subject: string, content: any): Promise<boolean> {
    const emailService = getEmailService();
    const htmlBody = typeof content === 'string' ? content : content.html;
    const textBody = typeof content === 'string' ? content : content.text;

    return await emailService.send({
      to,
      subject,
      html: htmlBody,
      text: textBody,
    });
  }

  /**
   * Get alert configuration status
   */
  getStatus(): {
    emailEnabled: boolean;
    slackEnabled: boolean;
    channels: AlertChannel[];
  } {
    return {
      emailEnabled: this.emailEnabled,
      slackEnabled: this.slackEnabled,
      channels: [
        {
          type: 'email',
          enabled: this.emailEnabled,
          config: this.emailEnabled && this.founderEmail ? { recipient: this.founderEmail } : undefined,
        },
        {
          type: 'slack',
          enabled: this.slackEnabled,
          config: this.slackEnabled && this.slackWebhookUrl
            ? {
                webhookUrl: `${this.slackWebhookUrl.substring(0, 20)}...`,
              }
            : undefined,
        },
      ],
    };
  }
}

/**
 * Singleton instance
 */
let instance: FounderAlertingSystem | null = null;

export function getFounderAlertingSystem(): FounderAlertingSystem {
  if (!instance) {
    instance = new FounderAlertingSystem();
  }
  return instance;
}
