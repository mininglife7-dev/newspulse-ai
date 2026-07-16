const BRAND_COLOR = '#3b82f6';
const SUPPORT_EMAIL = 'support@example.com';
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://euro-ai.example.com';

function emailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none; }
          .footer { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none; font-size: 12px; color: #666; }
          .button { display: inline-block; background-color: ${BRAND_COLOR}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: 600; }
          .button:hover { opacity: 0.9; }
          h2 { color: #1f2937; margin-top: 0; }
          .alert { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 15px 0; }
          .success { background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 12px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #1f2937;">EURO AI Compliance</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p style="margin: 0;">Questions? Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
            <p style="margin: 10px 0 0 0; border-top: 1px solid #ddd; padding-top: 10px;">© 2026 EURO AI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function obligationDeadlineReminder(
  userEmail: string,
  obligationTitle: string,
  daysRemaining: number
): { html: string; text: string } {
  const html = emailWrapper(`
    <h2>Compliance Deadline Reminder</h2>
    <p>Hi,</p>
    <p>This is a reminder that <strong>${obligationTitle}</strong> has <strong>${daysRemaining} days</strong> remaining.</p>
    ${daysRemaining <= 3 ? '<div class="alert"><strong>⚠️ Urgent:</strong> This obligation is due very soon. Please prioritize completion.</div>' : ''}
    <p>Please log in to EURO AI to review and complete this obligation.</p>
    <p><a href="${APP_URL}/remediation" class="button">View in Dashboard</a></p>
  `);

  const text = `Compliance Deadline Reminder\n\nHi,\n\nThis is a reminder that "${obligationTitle}" has ${daysRemaining} days remaining.\n\nPlease log in to EURO AI to review and complete this obligation.\n\nView in Dashboard: ${APP_URL}/remediation\n\nQuestions? Contact ${SUPPORT_EMAIL}`;

  return { html, text };
}

export function obligationAssigned(
  userEmail: string,
  obligationTitle: string,
  workspaceName: string
): { html: string; text: string } {
  const html = emailWrapper(`
    <h2>New Compliance Obligation Assigned</h2>
    <p>Hi,</p>
    <p>A new compliance obligation has been assigned to you in <strong>${workspaceName}</strong>:</p>
    <p style="background-color: #f3f4f6; padding: 12px; border-left: 4px solid ${BRAND_COLOR}; margin: 15px 0;">
      <strong>${obligationTitle}</strong>
    </p>
    <p>Please review the details and create a remediation plan as soon as possible.</p>
    <p><a href="${APP_URL}/remediation" class="button">Review Obligation</a></p>
  `);

  const text = `New Compliance Obligation Assigned\n\nHi,\n\nA new obligation has been assigned to you in "${workspaceName}":\n\n${obligationTitle}\n\nPlease review and create a remediation plan.\n\nReview Obligation: ${APP_URL}/remediation\n\nQuestions? Contact ${SUPPORT_EMAIL}`;

  return { html, text };
}

export function teamMemberInvited(
  inviteCode: string,
  workspaceName: string,
  inviterName: string
): { html: string; text: string } {
  const inviteUrl = `${APP_URL}/invite/${inviteCode}`;
  const html = emailWrapper(`
    <h2>You're Invited to EURO AI</h2>
    <p>Hi,</p>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on EURO AI.</p>
    <p>EURO AI helps organizations manage compliance with EU AI Act regulations and track obligations efficiently.</p>
    <p><a href="${inviteUrl}" class="button">Accept Invitation</a></p>
    <p style="color: #666; font-size: 12px; margin-top: 20px;">This invitation expires in 7 days.</p>
  `);

  const text = `You're Invited to EURO AI\n\nHi,\n\n${inviterName} has invited you to join "${workspaceName}" on EURO AI.\n\nEURO AI helps manage compliance with EU AI Act regulations.\n\nAccept Invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.\n\nQuestions? Contact ${SUPPORT_EMAIL}`;

  return { html, text };
}

export function evidenceSubmitted(
  userEmail: string,
  obligationTitle: string,
  workspaceName: string
): { html: string; text: string } {
  const html = emailWrapper(`
    <h2>Evidence Submission Confirmed</h2>
    <p>Hi,</p>
    <p>Your evidence for <strong>${obligationTitle}</strong> in <strong>${workspaceName}</strong> has been received and recorded.</p>
    <div class="success">
      <strong>✓ Submission confirmed</strong> — Thank you for maintaining compliance documentation.
    </div>
    <p>Your evidence is now part of your compliance audit trail and can be reviewed at any time.</p>
    <p><a href="${APP_URL}/evidence" class="button">View All Evidence</a></p>
  `);

  const text = `Evidence Submission Confirmed\n\nHi,\n\nYour evidence for "${obligationTitle}" in "${workspaceName}" has been received.\n\nThank you for maintaining compliance documentation.\n\nView All Evidence: ${APP_URL}/evidence\n\nQuestions? Contact ${SUPPORT_EMAIL}`;

  return { html, text };
}

export function remediationProgressUpdate(
  userEmail: string,
  obligationTitle: string,
  progressPercent: number
): { html: string; text: string } {
  const html = emailWrapper(`
    <h2>Remediation Progress Update</h2>
    <p>Hi,</p>
    <p>Your team's remediation progress for <strong>${obligationTitle}</strong> is now <strong>${progressPercent}%</strong> complete.</p>
    <div style="margin: 20px 0;">
      <div style="background-color: #e5e7eb; border-radius: 8px; height: 20px; overflow: hidden;">
        <div style="background-color: ${BRAND_COLOR}; height: 100%; width: ${progressPercent}%; transition: width 0.3s ease;"></div>
      </div>
      <p style="text-align: center; margin-top: 8px; font-weight: 600;">${progressPercent}%</p>
    </div>
    <p>Keep up the momentum! Continue with the remaining remediation steps.</p>
    <p><a href="${APP_URL}/remediation" class="button">View Progress</a></p>
  `);

  const text = `Remediation Progress Update\n\nHi,\n\nYour team's remediation progress for "${obligationTitle}" is now ${progressPercent}% complete.\n\nKeep up the momentum!\n\nView Progress: ${APP_URL}/remediation\n\nQuestions? Contact ${SUPPORT_EMAIL}`;

  return { html, text };
}

export function weeklyComplianceSummary(
  userEmail: string,
  workspaceName: string,
  stats: {
    totalObligations: number;
    completedObligations: number;
    dueSoon: number;
    overdue: number;
  }
): { html: string; text: string } {
  const completionRate = Math.round(
    (stats.completedObligations / stats.totalObligations) * 100
  );

  const html = emailWrapper(`
    <h2>Weekly Compliance Summary — ${workspaceName}</h2>
    <p>Hi,</p>
    <p>Here's your compliance status for the week:</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid ${BRAND_COLOR};">
        <div style="font-size: 24px; font-weight: bold; color: ${BRAND_COLOR};">${completionRate}%</div>
        <div style="color: #666; font-size: 14px;">Completion Rate</div>
      </div>
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${stats.dueSoon}</div>
        <div style="color: #666; font-size: 14px;">Due Soon (7 days)</div>
      </div>
      ${
        stats.overdue > 0
          ? `
        <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; grid-column: 1 / -1;">
          <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${stats.overdue}</div>
          <div style="color: #666; font-size: 14px;">Overdue Obligations</div>
        </div>
      `
          : ''
      }
    </div>

    <p>
      <a href="${APP_URL}/dashboard" class="button">View Full Dashboard</a>
    </p>
  `);

  const text = `Weekly Compliance Summary\n\nHi,\n\nHere's your compliance status:\n\nCompletion Rate: ${completionRate}%\nDue Soon (7 days): ${stats.dueSoon}\n${stats.overdue > 0 ? `Overdue: ${stats.overdue}\n` : ''}View Full Dashboard: ${APP_URL}/dashboard\n\nQuestions? Contact ${SUPPORT_EMAIL}`;

  return { html, text };
}
