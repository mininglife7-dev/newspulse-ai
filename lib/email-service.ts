/**
 * Email Service
 *
 * Multi-provider email delivery system for production incident alerting.
 * Supports SendGrid, AWS SES, and local development logging.
 *
 * Configuration via environment variables:
 * - EMAIL_PROVIDER: 'sendgrid' | 'ses' | 'log' (default: 'log')
 * - SENDGRID_API_KEY: SendGrid API key (required if EMAIL_PROVIDER=sendgrid)
 * - AWS_SES_REGION: AWS region for SES (required if EMAIL_PROVIDER=ses)
 * - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: AWS credentials
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export type EmailProvider = 'sendgrid' | 'ses' | 'log';

export class EmailService {
  private provider: EmailProvider;
  private sendgridApiKey?: string;
  private sesRegion?: string;
  private fromAddress: string;

  constructor() {
    this.provider = (process.env.EMAIL_PROVIDER as EmailProvider) || 'log';
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
    this.sesRegion = process.env.AWS_SES_REGION;
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@newspulse-ai.com';

    // Validate provider configuration
    if (this.provider === 'sendgrid' && !this.sendgridApiKey) {
      console.warn(
        'EmailService: SendGrid provider selected but SENDGRID_API_KEY not set. Falling back to logging.'
      );
      this.provider = 'log';
    }

    if (this.provider === 'ses' && !this.sesRegion) {
      console.warn('EmailService: SES provider selected but AWS_SES_REGION not set. Falling back to logging.');
      this.provider = 'log';
    }
  }

  async send(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text, from = this.fromAddress } = options;

    try {
      switch (this.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(from, to, subject, html, text);
        case 'ses':
          return await this.sendViaSES(from, to, subject, html, text);
        case 'log':
          return await this.logEmail(from, to, subject, html, text);
        default:
          console.error(`Unknown email provider: ${this.provider}`);
          return false;
      }
    } catch (error) {
      console.error('Email send failed:', error);
      return false;
    }
  }

  /**
   * Send via SendGrid REST API
   * https://docs.sendgrid.com/api-reference/mail-send/mail-send
   */
  private async sendViaSendGrid(
    from: string,
    to: string,
    subject: string,
    html?: string,
    text?: string
  ): Promise<boolean> {
    const payload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject,
        },
      ],
      from: { email: from },
      content: [] as Array<{ type: string; value: string }>,
    };

    if (html) {
      payload.content.push({ type: 'text/html', value: html });
    }
    if (text) {
      payload.content.push({ type: 'text/plain', value: text });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`SendGrid API error (${response.status}):`, error);
        return false;
      }

      console.log(`[EMAIL] Sent via SendGrid to ${to}: "${subject}"`);
      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send via AWS SES
   * Requires AWS credentials in environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
   * or IAM role if running on EC2/Lambda
   */
  private async sendViaSES(
    from: string,
    to: string,
    subject: string,
    html?: string,
    text?: string
  ): Promise<boolean> {
    // Check if AWS SDK is installed
    let SES: any;
    try {
      // Dynamic require to avoid hard dependency
      const awsSdk = require('@aws-sdk/client-ses') as any;
      SES = awsSdk.SES;
    } catch {
      console.warn('AWS SDK not installed. Cannot send via SES. Install @aws-sdk/client-ses');
      return false;
    }

    const sesClient = new SES({ region: this.sesRegion || 'us-east-1' });

    try {
      // Add 5-second timeout to SES operation using Promise.race
      const sendPromise = sesClient.sendEmail({
        Source: from,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: html
              ? {
                  Data: html,
                  Charset: 'UTF-8',
                }
              : undefined,
            Text: text
              ? {
                  Data: text,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SES send timeout after 5s')), 5000)
      );

      const response = await Promise.race([sendPromise, timeoutPromise]) as any;

      console.log(`[EMAIL] Sent via SES to ${to}: "${subject}" (MessageId: ${response.MessageId})`);
      return true;
    } catch (error) {
      console.error('SES send failed:', error);
      return false;
    }
  }

  /**
   * Log email to console (development/testing)
   */
  private async logEmail(
    from: string,
    to: string,
    subject: string,
    html?: string,
    text?: string
  ): Promise<boolean> {
    console.log(`
[EMAIL_LOG]
From: ${from}
To: ${to}
Subject: ${subject}
---
${html || text || '(empty body)'}
---
`);
    return true;
  }

  /**
   * Get configured provider
   */
  getProvider(): EmailProvider {
    return this.provider;
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    if (this.provider === 'sendgrid') {
      return !!this.sendgridApiKey;
    }
    if (this.provider === 'ses') {
      return !!this.sesRegion;
    }
    return true; // log provider always available
  }
}

/**
 * Singleton instance
 */
let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}
