# Email Notifications Setup Guide

## Overview

This guide covers implementing email notifications for the EURO AI platform. Email is critical for production to notify users of:

- Compliance deadline reminders
- Evidence submission confirmations
- Obligation assignment notifications
- Team member invitations

## Current Status

**Not yet implemented** - This is a Phase 4 enhancement. This guide provides the blueprint for implementation.

---

## Architecture Options

### Option 1: SendGrid (Recommended) ✓

**Best for**: Production, reliable, scalable, cost-effective  
**Cost**: Free tier available, $0.10/email at scale  
**Integration**: Simple API, webhook support  
**Setup time**: 30 minutes

### Option 2: AWS SES

**Best for**: AWS-based infrastructure  
**Cost**: $0.10/email at scale  
**Integration**: SDK integration  
**Setup time**: 45 minutes

### Option 3: Mailgun

**Best for**: Developer-friendly, detailed analytics  
**Cost**: Free tier, $0.50-1.00/email at scale  
**Setup time**: 45 minutes

---

## Implementation: SendGrid (Recommended)

### Step 1: Create SendGrid Account

1. Visit https://sendgrid.com
2. Sign up for free tier
3. Verify email address
4. Create new API key with "Mail Send" permissions
5. Copy API key

### Step 2: Configure Environment Variables

Add to Vercel environment variables:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=notifications@yourapp.com
SENDGRID_FROM_NAME=EURO AI Compliance
```

Add to `.env.local` (local development):

```bash
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@example.com
SENDGRID_FROM_NAME="EURO AI Compliance"
```

### Step 3: Install SendGrid SDK

```bash
npm install @sendgrid/mail
```

### Step 4: Create Email Service

```typescript
// lib/email.ts
import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await sgMail.send({
      to: options.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: process.env.SENDGRID_FROM_NAME,
      },
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: 'support@example.com',
      categories: ['euro-ai-notifications'],
    });
  } catch (error: any) {
    console.error('Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: error.message,
    });
    throw error;
  }
}
```

### Step 5: Create Email Templates

```typescript
// lib/email-templates.ts

export function obligationDeadlineReminder(
  userEmail: string,
  obligationTitle: string,
  daysRemaining: number
): string {
  return `
    <h2>Compliance Deadline Reminder</h2>
    <p>Hi,</p>
    <p>This is a reminder that <strong>${obligationTitle}</strong> has <strong>${daysRemaining} days</strong> remaining.</p>
    <p>Please log in to EURO AI to review and complete this obligation.</p>
    <a href="https://yourdomain.com/remediation" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a>
    <p style="color: #666; font-size: 12px;">Questions? Contact support@example.com</p>
  `;
}

export function obligationAssigned(
  userEmail: string,
  obligationTitle: string,
  workspaceName: string
): string {
  return `
    <h2>New Compliance Obligation Assigned</h2>
    <p>Hi,</p>
    <p>A new obligation has been assigned to you in <strong>${workspaceName}</strong>:</p>
    <p><strong>${obligationTitle}</strong></p>
    <p>Please review the details and create a remediation plan.</p>
    <a href="https://yourdomain.com/remediation" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Obligation</a>
  `;
}

export function teamMemberInvited(
  inviteCode: string,
  workspaceName: string,
  inviterName: string
): string {
  return `
    <h2>You're Invited to EURO AI</h2>
    <p>Hi,</p>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on EURO AI.</p>
    <p>EURO AI helps manage compliance with EU AI Act regulations.</p>
    <a href="https://yourdomain.com/invite/${inviteCode}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
    <p style="color: #666; font-size: 12px;">This invitation expires in 7 days.</p>
  `;
}

export function evidenceSubmitted(
  workspaceName: string,
  obligationTitle: string
): string {
  return `
    <h2>Evidence Submitted</h2>
    <p>Your evidence for <strong>${obligationTitle}</strong> in <strong>${workspaceName}</strong> has been received.</p>
    <p>Thank you for maintaining compliance documentation.</p>
    <a href="https://yourdomain.com/evidence" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Evidence</a>
  `;
}
```

### Step 6: Implement Scheduled Email Service

```typescript
// app/api/notifications/send-deadline-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { obligationDeadlineReminder } from '@/lib/email-templates';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// This endpoint should be called daily via a scheduled job (e.g., Vercel Cron)
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Sending deadline reminder emails', { requestId });

    // Find obligations due in next 7 days
    const today = new Date();
    const inSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: dueSoon, error: queryError } = await supabase
      .from('obligations')
      .select('id, title, deadline_days, created_at, ai_system_id')
      .eq('status', 'identified')
      .lte('deadline_days', 7)
      .gt('deadline_days', 0);

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    // Get assignees and send emails
    let emailsSent = 0;
    let errors = 0;

    for (const obligation of dueSoon || []) {
      try {
        // Get assigned users (you'd implement this based on your assignment logic)
        const { data: assignments } = await supabase
          .from('obligation_assignments')
          .select('user_id')
          .eq('obligation_id', obligation.id);

        for (const assignment of assignments || []) {
          // Get user email
          const { data: user } = await supabase.auth.admin.getUserById(
            assignment.user_id
          );

          if (user?.email) {
            const html = obligationDeadlineReminder(
              user.email,
              obligation.title,
              obligation.deadline_days
            );

            await sendEmail({
              to: user.email,
              subject: `Reminder: ${obligation.title} due in ${obligation.deadline_days} days`,
              html,
            });

            emailsSent++;
          }
        }
      } catch (error: any) {
        logger.error('Failed to send reminder email', {
          requestId,
          obligationId: obligation.id,
          error: error.message,
        });
        errors++;
      }
    }

    logger.info('Deadline reminders completed', {
      requestId,
      emailsSent,
      errors,
    });

    return NextResponse.json(
      {
        ok: true,
        emailsSent,
        errors,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Deadline reminder service failed', {
      requestId,
      error: error.message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

---

## Scheduling Email Jobs

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/notifications/send-deadline-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/notifications/send-weekly-digest",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

This sends reminders daily at 9 AM UTC and weekly digest on Mondays.

### Option 2: External Cron Service (e.g., cron-job.org)

```bash
# Set up external HTTP POST request
POST https://yourdomain.com/api/notifications/send-deadline-reminders
Authorization: Bearer YOUR_SECRET_TOKEN
```

### Option 3: Background Job Queue (for scale)

```bash
npm install bull redis
```

```typescript
// lib/email-queue.ts
import Queue from 'bull';

const emailQueue = new Queue('emails', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export async function queueEmail(options: EmailOptions): Promise<void> {
  await emailQueue.add(options, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}
```

---

## Email Triggers

### Implement in API Routes

```typescript
// app/api/obligations/identify/route.ts (add to existing endpoint)

import { sendEmail } from '@/lib/email';
import { obligationAssigned } from '@/lib/email-templates';

// After creating obligations:
for (const obligation of createdObligations || []) {
  // Notify workspace owner
  const { data: owner } = await supabase.auth.admin.getUserById(createdBy);

  if (owner?.email) {
    await sendEmail({
      to: owner.email,
      subject: `New Obligation: ${obligation.title}`,
      html: obligationAssigned(owner.email, obligation.title, workspaceName),
    });
  }
}
```

---

## Testing Emails Locally

### Option 1: Use SendGrid Sandbox Mode

```bash
export SENDGRID_SANDBOX_MODE_IN_DEBUG=true
npm run dev
```

Emails won't actually send, but you'll see them in logs.

### Option 2: Use Ethereal (Free Email Testing)

```bash
npm install nodemailer
```

```typescript
// Create test account and view emails at https://ethereal.email
```

### Option 3: Use Mailtrap (Free Tier Available)

1. Create account at mailtrap.io
2. Replace SendGrid with Mailtrap SMTP credentials
3. View all test emails in web dashboard

---

## Production Deployment Checklist

- [ ] SendGrid account created and API key stored in Vercel
- [ ] Email templates created with brand styling
- [ ] Send test email from production environment
- [ ] Verify emails reach inbox (check spam folder)
- [ ] Set up DKIM/SPF records for domain
- [ ] Configure bounce/complaint handling
- [ ] Implement email unsubscribe mechanism
- [ ] Add email preferences to user settings
- [ ] Test scheduled email jobs
- [ ] Monitor email delivery metrics

---

## Monitoring & Analytics

### Track Email Delivery

```typescript
// Webhook to handle SendGrid events
// app/api/webhooks/sendgrid/route.ts

export async function POST(req: NextRequest) {
  const events = await req.json();

  for (const event of events) {
    logger.info('Email event', {
      event: event.event,
      email: event.email,
      timestamp: event.timestamp,
    });

    if (event.event === 'bounce' || event.event === 'complaint') {
      // Update user email status or notify support
      await supabase.from('email_events').insert({
        event_type: event.event,
        email: event.email,
        reason: event.reason,
        timestamp: new Date(event.timestamp * 1000),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
```

### Key Metrics to Track

- **Delivery Rate**: % of emails successfully delivered
- **Open Rate**: % of emails opened
- **Click Rate**: % of links clicked
- **Bounce Rate**: % of emails bounced
- **Complaint Rate**: % marked as spam
- **Unsubscribe Rate**: % of unsubscribe requests

---

## Cost Estimation

### SendGrid (Recommended)

| Volume           | Cost/Month     | Cost/Year |
| ---------------- | -------------- | --------- |
| 1,000 emails     | $0 (free tier) | $0        |
| 10,000 emails    | $10            | $120      |
| 100,000 emails   | $100           | $1,200    |
| 1,000,000 emails | $1,000         | $12,000   |

For EURO AI MVP: Expect 100-1,000 emails/month = $1-10/month

---

## Best Practices

1. **Avoid Email Blasts**
   - Send emails asynchronously, not during request handling
   - Batch emails for scheduled jobs
   - Implement rate limiting (max 5 emails/minute per user)

2. **Email Deliverability**
   - Use authenticated sender domain (DKIM, SPF, DMARC)
   - Provide unsubscribe link in every email
   - Monitor bounce rates and remove bad addresses
   - Keep email list clean (remove hard bounces within 24h)

3. **Security & Privacy**
   - Never include sensitive data in email subject
   - Use secure links with tokens that expire
   - Comply with GDPR email preferences
   - Store email preferences per user

4. **User Experience**
   - Use clear, actionable subject lines
   - Include primary CTA button in email
   - Make emails mobile-responsive
   - Provide plain text alternative
   - Limit emails to 1-2 per user per day

---

## Implementation Timeline

**Phase 4.1 - Basic Setup** (2-3 hours)

- [ ] SendGrid account setup
- [ ] Email template creation
- [ ] Basic send endpoint implementation

**Phase 4.2 - Scheduled Jobs** (3-4 hours)

- [ ] Implement deadline reminder job
- [ ] Set up Vercel Cron
- [ ] Test email delivery

**Phase 4.3 - Full Integration** (5-6 hours)

- [ ] Add email to all obligation workflows
- [ ] Implement team invitation emails
- [ ] Add email preferences to user settings
- [ ] Set up webhook for bounce handling

**Total: ~10-13 hours for complete implementation**

---

## Support & Troubleshooting

### Emails Not Delivering

1. Check SendGrid dashboard for bounce/complaint
2. Verify domain DKIM/SPF records
3. Check email was queued (`logs` endpoint)
4. Verify recipient email is valid
5. Check SendGrid account limits not exceeded

### High Bounce Rate

1. Verify email addresses in database are valid
2. Implement email validation on signup
3. Remove bounced addresses from mailing list
4. Check authentication records (DKIM/SPF/DMARC)

### Testing Emails

```bash
# Send test email
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## Next Steps

1. **Immediate**: Review this guide and choose email provider
2. **Week 1**: Set up SendGrid account and configure environment
3. **Week 2**: Implement email service and templates
4. **Week 3**: Add to key workflows (obligations, invitations)
5. **Week 4**: Deploy, test, and monitor

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-07-16  
**Ready for Implementation**: Phase 4
