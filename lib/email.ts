import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn(
    'SENDGRID_API_KEY not set - email notifications will be logged but not sent'
  );
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  categories?: string[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('[EMAIL] Sandbox mode - would send email:', {
      to: options.to,
      subject: options.subject,
      categories: options.categories || [],
    });
    return;
  }

  try {
    await sgMail.send({
      to: options.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        name: process.env.SENDGRID_FROM_NAME || 'EURO AI Compliance',
      },
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || 'support@example.com',
      categories: options.categories || [],
      trackingSettings: {
        openTracking: { enable: true },
        clickTracking: { enable: true },
      },
    });
  } catch (error: any) {
    console.error('[EMAIL] Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}
