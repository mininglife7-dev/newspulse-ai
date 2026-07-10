import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordProductEvent,
  recordSignupEvent,
  recordFeatureEvent,
  recordErrorEvent,
  recordPerformanceEvent,
  getFunnelAnalysis,
  getHealthMetrics,
  shouldSampleEvent,
  isErrorRateHigh,
  isLatencyHigh,
  getActiveAlerts,
  type ProductEvent,
  type HealthMetrics,
} from '@/lib/product-observability';

global.fetch = vi.fn();

describe('Product Observability (DNA-GOV-014)', () => {
  const mockWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldSampleEvent', () => {
    it('should always sample signup events', () => {
      // signup_started has 1.0 sampling rate
      const results = Array.from({ length: 10 }, () => shouldSampleEvent('signup_started'));
      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should sample page_load events at ~1% rate', () => {
      const trials = 1000;
      const samples = Array.from({ length: trials }, () => shouldSampleEvent('page_load'));
      const sampledCount = samples.filter((s) => s).length;

      // Expect roughly 1% ±0.5% (5 to 15 out of 1000, allow edge cases)
      expect(sampledCount).toBeGreaterThanOrEqual(trials * 0.005);
      expect(sampledCount).toBeLessThanOrEqual(trials * 0.02); // 2% for safety margin
    });

    it('should sample validation_error events at ~10% rate', () => {
      const trials = 1000;
      const samples = Array.from({ length: trials }, () =>
        shouldSampleEvent('validation_error')
      );
      const sampledCount = samples.filter((s) => s).length;

      // Expect roughly 10% ±6% (allow edge cases)
      expect(sampledCount).toBeGreaterThanOrEqual(trials * 0.04);
      expect(sampledCount).toBeLessThanOrEqual(trials * 0.16);
    });
  });

  describe('recordProductEvent', () => {
    it('should record event successfully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const event: ProductEvent = {
        workspace_id: mockWorkspaceId,
        user_id: mockUserId,
        event_type: 'assessment_created',
        category: 'feature_adoption',
        metadata: { assessment_id: 'a123' },
      };

      const result = await recordProductEvent(event);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/telemetry/event',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const event: ProductEvent = {
        workspace_id: mockWorkspaceId,
        user_id: mockUserId,
        event_type: 'api_error',
        category: 'error',
        metadata: {},
      };

      const result = await recordProductEvent(event);

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const event: ProductEvent = {
        workspace_id: mockWorkspaceId,
        user_id: mockUserId,
        event_type: 'timeout_error',
        category: 'error',
        metadata: {},
      };

      const result = await recordProductEvent(event);

      expect(result).toBe(false);
    });

    it('should skip unsampled events silently', async () => {
      // Mock Math.random to return high value (won't sample)
      const mockMathRandom = vi.fn(() => 0.999);
      vi.stubGlobal('Math', {
        ...Math,
        random: mockMathRandom,
      });

      (global.fetch as any).mockResolvedValue({ ok: true });

      const event: ProductEvent = {
        workspace_id: mockWorkspaceId,
        user_id: mockUserId,
        event_type: 'page_load', // 1% sampling rate
        category: 'performance',
        metadata: { page: '/assessments' },
      };

      const result = await recordProductEvent(event);

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('recordSignupEvent', () => {
    it('should record signup_started event', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await recordSignupEvent(mockWorkspaceId, mockUserId, 'started');

      expect(result).toBe(true);
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.event_type).toBe('signup_started');
      expect(callBody.category).toBe('funnel');
    });

    it('should record email_verified event', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await recordSignupEvent(mockWorkspaceId, mockUserId, 'verified');

      expect(result).toBe(true);
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.event_type).toBe('email_verified');
    });

    it('should record all signup funnel stages', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const stages = ['started', 'verified', 'workspace_created', 'assessment_started', 'assessment_completed'] as const;

      for (const stage of stages) {
        await recordSignupEvent(mockWorkspaceId, mockUserId, stage);
      }

      expect(global.fetch).toHaveBeenCalledTimes(5);
    });
  });

  describe('recordFeatureEvent', () => {
    it('should record assessment_created event', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await recordFeatureEvent(mockWorkspaceId, mockUserId, 'assessment');

      expect(result).toBe(true);
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.event_type).toBe('assessment_created');
      expect(callBody.category).toBe('feature_adoption');
    });

    it('should include custom metadata', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const metadata = { assessment_id: 'a123', framework: 'ISO27001' };
      await recordFeatureEvent(mockWorkspaceId, mockUserId, 'assessment', metadata);

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.metadata).toEqual(metadata);
    });

    it('should record all feature types', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const features = ['assessment', 'obligation', 'evidence', 'export', 'framework'] as const;

      for (const feature of features) {
        await recordFeatureEvent(mockWorkspaceId, mockUserId, feature);
      }

      expect(global.fetch).toHaveBeenCalledTimes(5);
    });
  });

  describe('recordErrorEvent', () => {
    it('should record api_error', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await recordErrorEvent(mockWorkspaceId, mockUserId, 'api', {
        endpoint: '/api/assessments',
        status_code: 500,
      });

      expect(result).toBe(true);
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.event_type).toBe('api_error');
      expect(callBody.category).toBe('error');
    });

    it('should record validation_error', async () => {
      // Mock Math.random to ensure sampling (validation_error has 10% rate)
      vi.stubGlobal('Math', {
        ...Math,
        random: () => 0.05, // Will sample validation_error (10% rate)
      });

      (global.fetch as any).mockResolvedValue({ ok: true });

      await recordErrorEvent(mockWorkspaceId, mockUserId, 'validation', {
        field: 'company_name',
        error: 'required',
      });

      expect(global.fetch).toHaveBeenCalled();
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.event_type).toBe('validation_error');
    });

    it('should record all error types', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const errorTypes = ['api', 'validation', 'auth', 'timeout'] as const;

      for (const type of errorTypes) {
        await recordErrorEvent(mockWorkspaceId, mockUserId, type);
      }

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('recordPerformanceEvent', () => {
    it('should record page_load event', async () => {
      // Mock Math.random to ensure sampling (page_load has 1% rate)
      vi.stubGlobal('Math', {
        ...Math,
        random: () => 0.005, // Will sample page_load (1% rate)
      });

      (global.fetch as any).mockResolvedValue({ ok: true });

      await recordPerformanceEvent(mockWorkspaceId, mockUserId, 'page_load', {
        page_path: '/assessments',
        duration_ms: 1250,
        bundle_size_kb: 150,
      });

      expect(global.fetch).toHaveBeenCalled();
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.event_type).toBe('page_load');
      expect(callBody.category).toBe('performance');
      expect(callBody.metadata.duration_ms).toBe(1250);
    });

    it('should record api_request event', async () => {
      // Mock Math.random to ensure sampling (api_request has 1% rate)
      vi.stubGlobal('Math', {
        ...Math,
        random: () => 0.005, // Will sample api_request (1% rate)
      });

      (global.fetch as any).mockResolvedValue({ ok: true });

      await recordPerformanceEvent(mockWorkspaceId, mockUserId, 'api_request', {
        endpoint: '/api/assessments',
        method: 'POST',
        latency_ms: 245,
        status_code: 201,
      });

      expect(global.fetch).toHaveBeenCalled();
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.event_type).toBe('api_request');
      expect(callBody.metadata.latency_ms).toBe(245);
    });
  });

  describe('getFunnelAnalysis', () => {
    it('should fetch funnel data successfully', async () => {
      const mockFunnel = {
        funnel: [
          { stage: 'signup_started', count: 100, pct: 100 },
          { stage: 'email_verified', count: 80, pct: 80 },
          { stage: 'workspace_created', count: 70, pct: 70 },
          { stage: 'first_assessment', count: 52, pct: 52 },
        ],
        total_entries: 100,
        completion_rate: 0.52,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockFunnel,
      });

      const result = await getFunnelAnalysis(mockWorkspaceId);

      expect(result.funnel).toHaveLength(4);
      expect(result.completion_rate).toBe(0.52);
      expect(result.total_entries).toBe(100);
    });

    it('should include date range parameters', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ funnel: [], total_entries: 0, completion_rate: 0 }),
      });

      await getFunnelAnalysis(mockWorkspaceId, '2026-07-01', '2026-07-31');

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('start_date=2026-07-01');
      expect(callUrl).toContain('end_date=2026-07-31');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await getFunnelAnalysis(mockWorkspaceId);

      expect(result.funnel).toEqual([]);
      expect(result.completion_rate).toBe(0);
    });
  });

  describe('getHealthMetrics', () => {
    it('should fetch health metrics successfully', async () => {
      const mockMetrics: HealthMetrics = {
        api_p95_latency_ms: 245,
        error_rate: 0.0023,
        uptime_pct: 99.97,
        alerts: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMetrics,
      });

      const result = await getHealthMetrics();

      expect(result.api_p95_latency_ms).toBe(245);
      expect(result.error_rate).toBe(0.0023);
      expect(result.uptime_pct).toBe(99.97);
    });

    it('should include workspace_id if provided', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ api_p95_latency_ms: 0, error_rate: 0, uptime_pct: 100, alerts: [] }),
      });

      await getHealthMetrics(mockWorkspaceId);

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain(`workspace_id=${mockWorkspaceId}`);
    });

    it('should include active alerts', async () => {
      const mockMetrics: HealthMetrics = {
        api_p95_latency_ms: 500,
        error_rate: 0.05,
        uptime_pct: 99.5,
        alerts: [
          {
            id: 'a1',
            workspace_id: mockWorkspaceId,
            alert_type: 'high_latency',
            threshold: 300,
            current_value: 500,
            triggered_at: new Date().toISOString(),
            resolved_at: undefined,
            severity: 'critical',
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMetrics,
      });

      const result = await getHealthMetrics();

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].severity).toBe('critical');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await getHealthMetrics();

      expect(result.api_p95_latency_ms).toBe(0);
      expect(result.error_rate).toBe(0);
      expect(result.uptime_pct).toBe(100);
      expect(result.alerts).toEqual([]);
    });
  });

  describe('isErrorRateHigh', () => {
    it('should return true when error rate exceeds threshold', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 200,
        error_rate: 0.05,
        uptime_pct: 99.9,
        alerts: [],
      };

      expect(isErrorRateHigh(metrics, 0.01)).toBe(true);
    });

    it('should return false when error rate within threshold', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 200,
        error_rate: 0.005,
        uptime_pct: 99.9,
        alerts: [],
      };

      expect(isErrorRateHigh(metrics, 0.01)).toBe(false);
    });

    it('should use default threshold of 1%', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 200,
        error_rate: 0.015,
        uptime_pct: 99.9,
        alerts: [],
      };

      expect(isErrorRateHigh(metrics)).toBe(true);
    });
  });

  describe('isLatencyHigh', () => {
    it('should return true when latency exceeds threshold', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 600,
        error_rate: 0.001,
        uptime_pct: 99.9,
        alerts: [],
      };

      expect(isLatencyHigh(metrics, 500)).toBe(true);
    });

    it('should return false when latency within threshold', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 400,
        error_rate: 0.001,
        uptime_pct: 99.9,
        alerts: [],
      };

      expect(isLatencyHigh(metrics, 500)).toBe(false);
    });

    it('should use default threshold of 500ms', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 550,
        error_rate: 0.001,
        uptime_pct: 99.9,
        alerts: [],
      };

      expect(isLatencyHigh(metrics)).toBe(true);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only unresolved alerts', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 200,
        error_rate: 0.001,
        uptime_pct: 99.9,
        alerts: [
          {
            id: 'a1',
            workspace_id: mockWorkspaceId,
            alert_type: 'high_latency',
            threshold: 300,
            current_value: 350,
            triggered_at: new Date().toISOString(),
            resolved_at: undefined,
            severity: 'critical',
          },
          {
            id: 'a2',
            workspace_id: mockWorkspaceId,
            alert_type: 'high_error_rate',
            threshold: 0.01,
            current_value: 0.005,
            triggered_at: '2026-07-08T12:00:00Z',
            resolved_at: '2026-07-09T08:00:00Z',
            severity: 'warning',
          },
        ],
      };

      const active = getActiveAlerts(metrics);

      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('a1');
    });

    it('should return empty array when no active alerts', () => {
      const metrics: HealthMetrics = {
        api_p95_latency_ms: 200,
        error_rate: 0.001,
        uptime_pct: 99.9,
        alerts: [],
      };

      const active = getActiveAlerts(metrics);

      expect(active).toEqual([]);
    });
  });

  describe('Integration scenarios', () => {
    it('should track complete signup funnel', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const stages = ['started', 'verified', 'workspace_created', 'assessment_started', 'assessment_completed'] as const;

      for (const stage of stages) {
        await recordSignupEvent(mockWorkspaceId, mockUserId, stage);
      }

      expect(global.fetch).toHaveBeenCalledTimes(5);

      // Verify all events were recorded in funnel category
      const calls = (global.fetch as any).mock.calls;
      for (const call of calls) {
        const body = JSON.parse(call[1].body);
        expect(body.category).toBe('funnel');
      }
    });

    it('should detect and handle errors during signup', async () => {
      // Mock Math.random to ensure both events are sampled
      vi.stubGlobal('Math', {
        ...Math,
        random: () => 0.05, // Will sample validation_error (10% rate)
      });

      (global.fetch as any).mockResolvedValue({ ok: true });

      // Simulate validation error during signup
      await recordSignupEvent(mockWorkspaceId, mockUserId, 'started');
      await recordErrorEvent(mockWorkspaceId, mockUserId, 'validation', {
        field: 'email',
        error: 'invalid_email',
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);

      const validationCall = JSON.parse((global.fetch as any).mock.calls[1][1].body);
      expect(validationCall.event_type).toBe('validation_error');
    });

    it('should monitor system health during feature usage', async () => {
      // Ensure sampling happens for performance events (1% rate)
      vi.stubGlobal('Math', {
        ...Math,
        random: () => 0.005,
      });

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true }) // recordFeatureEvent
        .mockResolvedValueOnce({ ok: true }) // recordPerformanceEvent
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            api_p95_latency_ms: 245,
            error_rate: 0.0023,
            uptime_pct: 99.97,
            alerts: [],
          }),
        }); // getHealthMetrics

      await recordFeatureEvent(mockWorkspaceId, mockUserId, 'assessment');
      await recordPerformanceEvent(mockWorkspaceId, mockUserId, 'api_request', {
        endpoint: '/api/assessments',
        latency_ms: 245,
      });
      const metrics = await getHealthMetrics();

      expect(metrics.error_rate).toBeLessThan(0.01);
      expect(isLatencyHigh(metrics)).toBe(false);
    });
  });
});
