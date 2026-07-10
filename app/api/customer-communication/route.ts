import { NextResponse } from 'next/server';
import {
  identifyAffectedCustomers,
  selectTemplate,
  renderNotification,
  selectChannels,
  logCommunication,
  markDelivered,
  markFailed,
  getIncidentCommunications,
  calculateCommunicationMetrics,
  formatCommunicationReport,
  registerTemplate,
  simulateSendNotification,
  type AffectedCustomer,
  type NotificationChannel,
  type IncidentPhase,
  type NotificationSeverity,
} from '@/lib/customer-communication';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/customer-communication
 *
 * DNS-018 endpoint: Customer communication bridge for incident notifications.
 *
 * Query params:
 * - incidentId: Get communications for specific incident
 * - report: Return full communication report (report=true)
 * - format: Response format (json or markdown)
 *
 * Returns:
 * - 200 + communications: Communication logs for incident
 * - 200 + report: Communication report if report=true
 * - 404: Incident not found
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const incidentId = url.searchParams.get('incidentId');
    const reportParam = url.searchParams.get('report') === 'true';
    const format = url.searchParams.get('format') || 'json';

    if (!incidentId) {
      return NextResponse.json(
        { ok: false, error: 'Missing incidentId parameter' },
        { status: 400 }
      );
    }

    const communications = getIncidentCommunications(incidentId);

    if (communications.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No communications found for incident', incidentId },
        { status: 404 }
      );
    }

    // Get full report if requested
    if (reportParam) {
      const metrics = calculateCommunicationMetrics(incidentId);
      const formatted = formatCommunicationReport(incidentId, metrics);

      if (format === 'markdown') {
        return new NextResponse(formatted, {
          status: 200,
          headers: { 'content-type': 'text/markdown; charset=utf-8' },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          incidentId,
          timestamp: new Date().toISOString(),
          metrics,
          communications,
          formatted,
        },
        { status: 200 }
      );
    }

    // Return communications list
    const metrics = calculateCommunicationMetrics(incidentId);

    return NextResponse.json(
      {
        ok: true,
        incidentId,
        timestamp: new Date().toISOString(),
        communicationCount: communications.length,
        metrics: {
          totalCustomersAffected: metrics.totalCustomersAffected,
          notificationsSent: metrics.notificationsSent,
          notificationsDelivered: metrics.notificationsDelivered,
          deliveryRate: metrics.deliveryRate,
        },
        communications,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[customer-communication] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Customer communication query failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer-communication
 *
 * Notify customers about an incident.
 *
 * Body:
 * {
 *   action: 'notify-customers' | 'register-template' | 'mark-delivered' | 'mark-failed',
 *   incidentId: string,
 *   severity: 'informational' | 'warning' | 'critical',
 *   phase: 'detected' | 'investigating' | 'identified' | 'mitigating' | 'recovering' | 'resolved',
 *   affectedServices: string[],
 *   affectedCustomers?: AffectedCustomer[],
 *   templateId?: string,
 *   context?: Record<string, string>,
 *   communicationId?: string (for mark-delivered/mark-failed),
 *   failureReason?: string (for mark-failed)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, incidentId } = body;

    if (!action) {
      return NextResponse.json(
        { ok: false, error: 'Missing action field' },
        { status: 400 }
      );
    }

    // Register custom template
    if (action === 'register-template') {
      const { template } = body;
      if (!template || !template.id) {
        return NextResponse.json(
          { ok: false, error: 'Missing template data' },
          { status: 400 }
        );
      }

      registerTemplate(template);

      return NextResponse.json(
        {
          ok: true,
          message: `Template ${template.id} registered`,
          timestamp: new Date().toISOString(),
        },
        { status: 201 }
      );
    }

    // Notify customers
    if (action === 'notify-customers') {
      if (!incidentId) {
        return NextResponse.json(
          { ok: false, error: 'Missing incidentId for notify-customers' },
          { status: 400 }
        );
      }

      const { severity, phase, affectedServices, affectedCustomers, templateId, context } = body;

      if (!severity || !phase || !affectedServices || !affectedCustomers) {
        return NextResponse.json(
          { ok: false, error: 'Missing required fields for notification' },
          { status: 400 }
        );
      }

      // Identify affected customers
      const affected = identifyAffectedCustomers(affectedServices, affectedCustomers as AffectedCustomer[]);

      if (affected.length === 0) {
        return NextResponse.json(
          {
            ok: true,
            message: 'No affected customers found',
            incidentId,
            communicationsSent: 0,
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Select template
      const template = templateId
        ? registerTemplate({ id: templateId, severity: severity as NotificationSeverity, phase: phase as IncidentPhase, subject: '', body: '' })
        : selectTemplate(phase as IncidentPhase, severity as NotificationSeverity);

      if (!template) {
        return NextResponse.json(
          { ok: false, error: 'No template found for phase and severity combination' },
          { status: 400 }
        );
      }

      // Render notification
      const notification = renderNotification(template, context || {});

      // Send notifications to all affected customers
      const communicationLogs: string[] = [];
      affected.forEach((customer) => {
        const channels = selectChannels(customer, severity as NotificationSeverity);

        channels.forEach((channel) => {
          const log = logCommunication(
            incidentId,
            customer,
            channel as NotificationChannel,
            severity as NotificationSeverity,
            phase as IncidentPhase,
            notification
          );

          // Simulate sending and mark as delivered/failed
          const result = simulateSendNotification(log);
          log.sentAt = new Date().toISOString();

          if (!result.success) {
            markFailed(log.id, 'Simulated delivery failure');
          } else {
            markDelivered(log.id);
          }

          communicationLogs.push(log.id);
        });
      });

      const metrics = calculateCommunicationMetrics(incidentId);

      return NextResponse.json(
        {
          ok: true,
          incidentId,
          phase,
          severity,
          affectedCustomersNotified: affected.length,
          communicationsSent: communicationLogs.length,
          metrics,
          timestamp: new Date().toISOString(),
        },
        { status: 201 }
      );
    }

    // Mark communication as delivered
    if (action === 'mark-delivered') {
      const { communicationId } = body;

      if (!communicationId) {
        return NextResponse.json(
          { ok: false, error: 'Missing communicationId' },
          { status: 400 }
        );
      }

      const communications = getIncidentCommunications(incidentId || '');
      const comm = communications.find((c) => c.id === communicationId);

      if (!comm) {
        return NextResponse.json(
          { ok: false, error: 'Communication not found', communicationId },
          { status: 404 }
        );
      }

      markDelivered(communicationId);

      return NextResponse.json(
        {
          ok: true,
          message: 'Communication marked as delivered',
          communicationId,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Mark communication as failed
    if (action === 'mark-failed') {
      const { communicationId, failureReason } = body;

      if (!communicationId) {
        return NextResponse.json(
          { ok: false, error: 'Missing communicationId' },
          { status: 400 }
        );
      }

      const communications = getIncidentCommunications(incidentId || '');
      const comm = communications.find((c) => c.id === communicationId);

      if (!comm) {
        return NextResponse.json(
          { ok: false, error: 'Communication not found', communicationId },
          { status: 404 }
        );
      }

      markFailed(communicationId, failureReason || 'Delivery failed');

      return NextResponse.json(
        {
          ok: true,
          message: 'Communication marked as failed',
          communicationId,
          reason: failureReason,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[customer-communication] Failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Customer communication operation failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
