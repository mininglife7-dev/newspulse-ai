import { describe, it, expect, beforeEach } from 'vitest';
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
  registerTemplate,
  formatCommunicationReport,
  resetCommunicationLog,
  type AffectedCustomer,
} from '@/lib/customer-communication';

describe('Customer Communication Bridge', () => {
  beforeEach(() => {
    resetCommunicationLog();
  });

  describe('identifyAffectedCustomers', () => {
    it('should identify customers affected by incident', () => {
      const customers: AffectedCustomer[] = [
        {
          customerId: 'c1',
          email: 'user1@example.com',
          name: 'User 1',
          affectedServices: ['api', 'database'],
          preferredChannels: ['email'],
        },
        {
          customerId: 'c2',
          email: 'user2@example.com',
          name: 'User 2',
          affectedServices: ['web'],
          preferredChannels: ['email'],
        },
        {
          customerId: 'c3',
          email: 'user3@example.com',
          name: 'User 3',
          affectedServices: ['api'],
          preferredChannels: ['email'],
        },
      ];

      const affected = identifyAffectedCustomers(['api', 'database'], customers);

      expect(affected).toHaveLength(2);
      expect(affected.map((c) => c.customerId)).toContain('c1');
      expect(affected.map((c) => c.customerId)).toContain('c3');
    });

    it('should identify multiple affected customers', () => {
      const customers: AffectedCustomer[] = [
        {
          customerId: 'c1',
          email: 'user1@example.com',
          name: 'User 1',
          affectedServices: ['api'],
          preferredChannels: ['email'],
        },
        {
          customerId: 'c2',
          email: 'user2@example.com',
          name: 'User 2',
          affectedServices: ['api', 'web'],
          preferredChannels: ['email'],
        },
      ];

      const affected = identifyAffectedCustomers(['api'], customers);

      expect(affected).toHaveLength(2);
    });
  });

  describe('selectTemplate', () => {
    it('should select template by phase and severity', () => {
      const template = selectTemplate('detected', 'critical');

      expect(template).toBeDefined();
      expect(template?.id).toBe('critical-detected');
      expect(template?.subject).toContain('Service Alert');
    });

    it('should return fallback template when exact match not found', () => {
      const template = selectTemplate('investigating', 'informational');

      expect(template).toBeDefined();
      // Should fallback to informational-status
      expect(template?.id).toBe('informational-status');
    });
  });

  describe('renderNotification', () => {
    it('should render template with context variables', () => {
      const template = selectTemplate('detected', 'critical')!;

      const rendered = renderNotification(template, {
        serviceName: 'API Service',
        estimatedTime: '2 hours',
      });

      expect(rendered.subject).toContain('API Service');
      expect(rendered.body).toContain('API Service');
      expect(rendered.body).toContain('2 hours');
    });

    it('should handle multiple placeholder replacements', () => {
      const template = selectTemplate('identified', 'critical')!;

      const rendered = renderNotification(template, {
        serviceName: 'Database',
        rootCause: 'Connection pool exhaustion',
        estimatedRecovery: '30 minutes',
      });

      expect(rendered.body).toContain('Database');
      expect(rendered.body).toContain('Connection pool exhaustion');
      expect(rendered.body).toContain('30 minutes');
    });
  });

  describe('selectChannels', () => {
    it('should select multiple channels for critical incidents to VIP customers', () => {
      const customer: AffectedCustomer = {
        customerId: 'vip1',
        email: 'vip@example.com',
        name: 'VIP Customer',
        affectedServices: ['api'],
        preferredChannels: ['email', 'sms'],
        isVIP: true,
      };

      const channels = selectChannels(customer, 'critical');

      expect(channels).toContain('email');
      expect(channels).toContain('sms');
      expect(channels).toContain('in-app');
      expect(channels.length).toBeGreaterThan(2);
    });

    it('should respect customer channel preferences for non-critical incidents', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email', 'in-app'],
        isVIP: false,
      };

      const channels = selectChannels(customer, 'warning');

      expect(channels.length).toBeLessThanOrEqual(2);
      expect(channels.every((c) => customer.preferredChannels.includes(c))).toBe(true);
    });

    it('should use email for critical incidents regardless of preference', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['sms'],
        isVIP: false,
      };

      const channels = selectChannels(customer, 'critical');

      expect(channels).toContain('email');
    });
  });

  describe('logCommunication', () => {
    it('should create communication log entry', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email'],
      };

      const log = logCommunication(
        'incident-123',
        customer,
        'email',
        'critical',
        'detected',
        {
          subject: 'Alert',
          body: 'Service down',
        }
      );

      expect(log.incidentId).toBe('incident-123');
      expect(log.customerId).toBe('c1');
      expect(log.channel).toBe('email');
      expect(log.severity).toBe('critical');
      expect(log.status).toBe('queued');
    });
  });

  describe('markDelivered', () => {
    it('should mark communication as delivered', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email'],
      };

      const log = logCommunication(
        'incident-123',
        customer,
        'email',
        'critical',
        'detected',
        {
          subject: 'Alert',
          body: 'Service down',
        }
      );

      const updated = markDelivered(log.id);

      expect(updated?.status).toBe('delivered');
      expect(updated?.deliveredAt).toBeDefined();
    });
  });

  describe('markFailed', () => {
    it('should mark communication as failed with reason', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email'],
      };

      const log = logCommunication(
        'incident-123',
        customer,
        'email',
        'critical',
        'detected',
        {
          subject: 'Alert',
          body: 'Service down',
        }
      );

      const updated = markFailed(log.id, 'Invalid email address');

      expect(updated?.status).toBe('failed');
      expect(updated?.failureReason).toBe('Invalid email address');
    });
  });

  describe('getIncidentCommunications', () => {
    it('should retrieve all communications for incident', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email', 'sms'],
      };

      logCommunication('incident-123', customer, 'email', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      logCommunication('incident-123', customer, 'sms', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      logCommunication('incident-456', customer, 'email', 'warning', 'investigating', {
        subject: 'Update',
        body: 'Investigating',
      });

      const communications = getIncidentCommunications('incident-123');

      expect(communications).toHaveLength(2);
      expect(communications.every((c) => c.incidentId === 'incident-123')).toBe(true);
    });
  });

  describe('calculateCommunicationMetrics', () => {
    it('should calculate communication metrics for incident', () => {
      const customer1: AffectedCustomer = {
        customerId: 'c1',
        email: 'user1@example.com',
        name: 'Customer 1',
        affectedServices: ['api'],
        preferredChannels: ['email'],
      };

      const customer2: AffectedCustomer = {
        customerId: 'c2',
        email: 'user2@example.com',
        name: 'Customer 2',
        affectedServices: ['api'],
        preferredChannels: ['email'],
      };

      const log1 = logCommunication('incident-123', customer1, 'email', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      const log2 = logCommunication('incident-123', customer2, 'email', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      markDelivered(log1.id);
      markDelivered(log2.id);

      const metrics = calculateCommunicationMetrics('incident-123');

      expect(metrics.totalCustomersAffected).toBe(2);
      expect(metrics.criticalCustomers).toBe(2);
      expect(metrics.notificationsSent).toBe(2);
      expect(metrics.notificationsDelivered).toBe(2);
      expect(metrics.deliveryRate).toBe(100);
    });

    it('should calculate delivery rate with failures', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email'],
      };

      const log1 = logCommunication('incident-123', customer, 'email', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      const log2 = logCommunication('incident-123', customer, 'sms', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      markDelivered(log1.id);
      markFailed(log2.id, 'Failed delivery');

      const metrics = calculateCommunicationMetrics('incident-123');

      expect(metrics.notificationsSent).toBe(2);
      expect(metrics.notificationsDelivered).toBe(1);
      expect(metrics.deliveryRate).toBe(50);
    });

    it('should breakdown communications by channel', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email', 'sms', 'in-app'],
      };

      logCommunication('incident-123', customer, 'email', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      logCommunication('incident-123', customer, 'sms', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      logCommunication('incident-123', customer, 'in-app', 'critical', 'detected', {
        subject: 'Alert',
        body: 'Detected',
      });

      const metrics = calculateCommunicationMetrics('incident-123');

      expect(metrics.channelBreakdown.email).toBe(1);
      expect(metrics.channelBreakdown.sms).toBe(1);
      expect(metrics.channelBreakdown['in-app']).toBe(1);
    });
  });

  describe('formatCommunicationReport', () => {
    it('should format communication report as markdown', () => {
      const customer: AffectedCustomer = {
        customerId: 'c1',
        email: 'user@example.com',
        name: 'Customer',
        affectedServices: ['api'],
        preferredChannels: ['email'],
      };

      const log = logCommunication('incident-123', customer, 'email', 'critical', 'detected', {
        subject: 'Alert: API Down',
        body: 'Service is down',
      });

      markDelivered(log.id);

      const metrics = calculateCommunicationMetrics('incident-123');
      const report = formatCommunicationReport('incident-123', metrics);

      expect(report).toContain('Customer Communication Report');
      expect(report).toContain('incident-123');
      expect(report).toContain('Total Customers Affected');
      expect(report).toContain('Delivery Rate');
      expect(report).toContain('Alert: API Down');
    });
  });

  describe('integration: full communication lifecycle', () => {
    it('should handle complete incident communication cycle', () => {
      const customers: AffectedCustomer[] = [
        {
          customerId: 'vip1',
          email: 'vip@example.com',
          name: 'VIP Customer',
          affectedServices: ['api'],
          preferredChannels: ['email', 'sms'],
          isVIP: true,
        },
        {
          customerId: 'c1',
          email: 'user1@example.com',
          name: 'Customer 1',
          affectedServices: ['api'],
          preferredChannels: ['email'],
        },
      ];

      // Detect incident
      const affectedCustomers = identifyAffectedCustomers(['api'], customers);
      expect(affectedCustomers).toHaveLength(2);

      // Send critical alert
      const logs: string[] = [];
      affectedCustomers.forEach((customer) => {
        const template = selectTemplate('detected', 'critical')!;
        const notification = renderNotification(template, {
          serviceName: 'API Service',
          estimatedTime: '2 hours',
        });
        const channels = selectChannels(customer, 'critical');

        channels.forEach((channel) => {
          const log = logCommunication('incident-123', customer, channel, 'critical', 'detected', notification);
          logs.push(log.id);
          markDelivered(log.id);
        });
      });

      // Verify communications sent
      const comms = getIncidentCommunications('incident-123');
      expect(comms.length).toBeGreaterThan(0);

      // Calculate metrics
      const metrics = calculateCommunicationMetrics('incident-123');
      expect(metrics.totalCustomersAffected).toBe(2);
      expect(metrics.deliveryRate).toBe(100);

      // Format report
      const report = formatCommunicationReport('incident-123', metrics);
      expect(report).toContain('API Service');
      expect(report).toContain('✓');
    });
  });
});
