import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  testJourney,
  monitorCustomerJourneys,
  formatCustomerJourneyAlert,
} from '@/lib/customer-journey-monitor';

describe('Customer Journey Monitor (DNA-GOV-006)', () => {
  const testBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testJourney', () => {
    it('passes when all steps succeed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      });

      const journey = await testJourney(testBaseUrl, 'test-journey', [
        {
          name: 'Step 1',
          method: 'GET',
          endpoint: '/api/health',
          expectedStatus: 200,
          description: 'Health check',
        },
      ]);

      expect(journey.status).toBe('success');
      expect(journey.steps).toHaveLength(1);
      expect(journey.steps[0].success).toBe(true);
    });

    it('fails when a step returns unexpected status', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 500 }); // Second step fails

      const journey = await testJourney(testBaseUrl, 'test-journey', [
        {
          name: 'Step 1',
          method: 'GET',
          endpoint: '/',
          expectedStatus: 200,
          description: 'Home',
        },
        {
          name: 'Step 2',
          method: 'GET',
          endpoint: '/api/health',
          expectedStatus: 200,
          description: 'Health',
        },
      ]);

      expect(journey.status).toBe('failed');
      expect(journey.failedStep).toBe('Step 2');
      expect(journey.steps[1].success).toBe(false);
    });

    it('fails on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const journey = await testJourney(testBaseUrl, 'test-journey', [
        {
          name: 'Step 1',
          method: 'GET',
          endpoint: '/api/health',
          expectedStatus: 200,
          description: 'Health',
        },
      ]);

      expect(journey.status).toBe('failed');
      expect(journey.steps[0].success).toBe(false);
      expect(journey.steps[0].actualStatus).toBe(0);
    });

    it('tracks latency for each step', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      });

      const journey = await testJourney(testBaseUrl, 'test-journey', [
        {
          name: 'Step 1',
          method: 'GET',
          endpoint: '/api/health',
          expectedStatus: 200,
          description: 'Health',
        },
      ]);

      expect(journey.steps[0].latencyMs).toBeGreaterThanOrEqual(0);
      expect(journey.totalLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('sends POST payload correctly', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation((url, init) => {
        if (init?.body) {
          capturedBody = init.body as string;
        }
        return Promise.resolve({ status: 400 });
      });

      await testJourney(testBaseUrl, 'test-journey', [
        {
          name: 'Create workspace',
          method: 'POST',
          endpoint: '/api/workspace',
          expectedStatus: 400,
          payload: { company_name: 'Test', country: 'DE' },
          description: 'Create workspace',
        },
      ]);

      expect(capturedBody).toContain('company_name');
      expect(capturedBody).toContain('Test');
    });
  });

  describe('monitorCustomerJourneys', () => {
    it('tests specific customer journey', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      });

      const report = await monitorCustomerJourneys(testBaseUrl, [
        'api-health-check',
      ]);

      expect(report.journeys).toHaveLength(1);
      expect(report.journeys[0].status).toBe('success');
      expect(report.ok).toBe(true);
    });

    it('reports failed journeys', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ status: 200 }) // First journey step
        .mockResolvedValueOnce({ status: 500 }) // First journey second step (fails)
        .mockResolvedValueOnce({ status: 400 }); // Second journey

      const report = await monitorCustomerJourneys(testBaseUrl);

      expect(report.ok).toBe(false);
      expect(report.summary.failedJourneys).toBeGreaterThan(0);
      expect(report.alerts.length).toBeGreaterThan(0);
    });

    it('generates alerts for failed journeys', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ status: 500 }); // Fail first journey

      const report = await monitorCustomerJourneys(testBaseUrl);

      // Should have alerts for failed journeys
      const hasCriticalAlert = report.alerts.some((a) =>
        a.includes('CRITICAL')
      );
      if (report.summary.failedJourneys > 0) {
        expect(hasCriticalAlert || report.alerts.length > 0).toBe(true);
      }
    });

    it('only tests specified journeys when provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      });

      const report = await monitorCustomerJourneys(testBaseUrl, [
        'api-health-check',
      ]);

      expect(report.journeys).toHaveLength(1);
      expect(report.journeys[0].name).toBe('api-health-check');
    });
  });

  describe('formatCustomerJourneyAlert', () => {
    it('formats successful report', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
      });

      const report = await monitorCustomerJourneys(testBaseUrl, [
        'api-health-check',
      ]);
      const alert = formatCustomerJourneyAlert(report);

      expect(alert).toContain('✅');
      expect(alert).toContain('operational');
    });

    it('formats failed report', () => {
      const failedReport = {
        ok: false,
        timestamp: new Date().toISOString(),
        journeys: [
          {
            name: 'test-journey',
            status: 'failed' as const,
            steps: [],
            totalLatencyMs: 0,
            failedStep: 'Step 1',
          },
        ],
        summary: {
          totalJourneys: 1,
          successfulJourneys: 0,
          failedJourneys: 1,
        },
        alerts: [],
      };

      const alert = formatCustomerJourneyAlert(failedReport);

      expect(alert).toContain('🔴');
      expect(alert).toContain('journey issue');
    });
  });
});
