import { describe, it, expect, beforeEach } from 'vitest';
import {
  deploymentMismatchScenario,
  connectionPoolExhaustionScenario,
  cascadingApiFailureScenario,
  memoryLeakScenario,
  billingLimitScenario,
  getAllScenarios,
  validateWarGameResult,
  summarizeWarGameResults,
  type WarGameScenario,
  type WarGameResult,
} from '@/lib/war-games';

describe('DNS-026: Production War Games & Orchestration Validation', () => {
  describe('Scenario Definitions', () => {
    it('should define deployment mismatch scenario', () => {
      expect(deploymentMismatchScenario.name).toBe('Deployment Schema Mismatch');
      expect(deploymentMismatchScenario.severity).toBe('critical');
      expect(deploymentMismatchScenario.errorMetrics.totalErrors).toBeGreaterThan(0);
      expect(deploymentMismatchScenario.errorPatterns.length).toBeGreaterThan(0);
    });

    it('should define connection pool exhaustion scenario', () => {
      expect(connectionPoolExhaustionScenario.name).toBe('Connection Pool Exhaustion');
      expect(connectionPoolExhaustionScenario.category).toBe('database');
      expect(connectionPoolExhaustionScenario.severity).toBe('high');
    });

    it('should define cascading API failure scenario', () => {
      expect(cascadingApiFailureScenario.name).toBe('Cascading API Failure');
      expect(cascadingApiFailureScenario.category).toBe('cascading');
      expect(cascadingApiFailureScenario.expectedIncidents).toBe(2);
    });

    it('should define memory leak scenario', () => {
      expect(memoryLeakScenario.name).toBe('Memory Leak Degradation');
      expect(memoryLeakScenario.category).toBe('infrastructure');
    });

    it('should define billing limit scenario', () => {
      expect(billingLimitScenario.name).toBe('Rate Limit / Billing Cap');
      expect(billingLimitScenario.severity).toBe('medium');
    });

    it('should get all scenarios', () => {
      const scenarios = getAllScenarios();
      expect(scenarios.length).toBe(5);
      expect(scenarios).toContain(deploymentMismatchScenario);
    });
  });

  describe('Scenario Validation', () => {
    it('should validate complete scenario structure', () => {
      const scenario = deploymentMismatchScenario;

      expect(scenario.name).toBeDefined();
      expect(scenario.description).toBeDefined();
      expect(scenario.category).toBeDefined();
      expect(scenario.severity).toBeDefined();
      expect(scenario.errorMetrics).toBeDefined();
      expect(scenario.errorMetrics.totalErrors).toBeGreaterThan(0);
      expect(scenario.errorMetrics.errorRate).toBeGreaterThan(0);
      expect(scenario.errorPatterns.length).toBeGreaterThan(0);
      expect(scenario.expectedDetectionTime).toBeGreaterThan(0);
      expect(scenario.expectedRemediationTime).toBeGreaterThan(0);
      expect(scenario.expectedIncidents).toBeGreaterThan(0);
    });

    it('should have realistic error metrics for each scenario', () => {
      getAllScenarios().forEach((scenario) => {
        expect(scenario.errorMetrics.totalErrors).toBeGreaterThan(100);
        expect(scenario.errorMetrics.errorRate).toBeGreaterThan(1);
        expect(Object.keys(scenario.errorMetrics.errorsByCategory).length).toBeGreaterThan(0);
        expect(Object.keys(scenario.errorMetrics.errorsBySeverity).length).toBeGreaterThan(0);
      });
    });

    it('should have detailed error patterns', () => {
      getAllScenarios().forEach((scenario) => {
        scenario.errorPatterns.forEach((pattern) => {
          expect(pattern.fingerprint).toBeDefined();
          expect(pattern.category).toBeDefined();
          expect(pattern.message).toBeDefined();
          expect(pattern.severity).toBeDefined();
          expect(pattern.occurrenceCount).toBeGreaterThan(0);
        });
      });
    });

    it('should have realistic timing expectations', () => {
      getAllScenarios().forEach((scenario) => {
        // Detection should be fast (< 200ms)
        expect(scenario.expectedDetectionTime).toBeLessThan(200);
        // Remediation varies but should be measurable
        expect(scenario.expectedRemediationTime).toBeGreaterThan(1000);
      });
    });
  });

  describe('War Game Result Validation', () => {
    const createMockResult = (scenario: WarGameScenario, overrides: Partial<WarGameResult> = {}): WarGameResult => ({
      scenarioName: scenario.name,
      executedAt: new Date().toISOString(),
      detectionTime: scenario.expectedDetectionTime + 10,
      remediationTime: scenario.expectedRemediationTime + 5000,
      success: true,
      incidentsDetected: scenario.expectedIncidents,
      remediationExecuted: ['critical', 'high'].includes(scenario.severity),
      foundationAlerted: scenario.severity === 'critical',
      escalated: scenario.severity === 'critical',
      timeline: [
        {
          timestamp: new Date().toISOString(),
          phase: 'detection',
          system: 'DNS-023',
          action: 'Detected error spike',
          result: 'success',
        },
        {
          timestamp: new Date().toISOString(),
          phase: 'analysis',
          system: 'DNS-025',
          action: 'Analyzed regression',
          result: 'success',
        },
        {
          timestamp: new Date().toISOString(),
          phase: 'decision',
          system: 'DNS-017',
          action: 'Decided remediation',
          result: 'success',
        },
      ],
      postMortemCreated: ['critical', 'high'].includes(scenario.severity),
      preventionIssuesCreated: scenario.expectedIncidents,
      metrics: {
        mttr: scenario.expectedRemediationTime / 1000 / 60, // minutes
        mttd: scenario.expectedDetectionTime / 1000, // seconds
        successRateImpact: scenario.errorMetrics.errorRate,
      },
      ...overrides,
    });

    it('should validate successful result for critical scenario', () => {
      const result = createMockResult(deploymentMismatchScenario);
      const validation = validateWarGameResult(result, deploymentMismatchScenario);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should catch slow detection', () => {
      const result = createMockResult(deploymentMismatchScenario, {
        detectionTime: 500, // Way over expected
      });
      const validation = validateWarGameResult(result, deploymentMismatchScenario);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Detection too slow'))).toBe(true);
    });

    it('should catch wrong incident count', () => {
      const result = createMockResult(deploymentMismatchScenario, {
        incidentsDetected: 3, // Should be 1
      });
      const validation = validateWarGameResult(result, deploymentMismatchScenario);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('incident count'))).toBe(true);
    });

    it('should require remediation for critical', () => {
      const result = createMockResult(deploymentMismatchScenario, {
        remediationExecuted: false,
      });
      const validation = validateWarGameResult(result, deploymentMismatchScenario);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('remediation'))).toBe(true);
    });

    it('should require post-mortem for critical', () => {
      const result = createMockResult(deploymentMismatchScenario, {
        postMortemCreated: false,
      });
      const validation = validateWarGameResult(result, deploymentMismatchScenario);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('post-mortem'))).toBe(true);
    });

    it('should require all key phases in timeline', () => {
      const result = createMockResult(deploymentMismatchScenario, {
        timeline: [
          {
            timestamp: new Date().toISOString(),
            phase: 'detection',
            system: 'DNS-023',
            action: 'Detected',
            result: 'success',
          },
          // Missing 'analysis' and 'decision'
        ],
      });
      const validation = validateWarGameResult(result, deploymentMismatchScenario);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('War Game Results Summary', () => {
    const createMockResults = (count: number): WarGameResult[] => {
      const scenarios = getAllScenarios();
      return scenarios.slice(0, count).map((scenario, index) =>
        ({
          scenarioName: scenario.name,
          executedAt: new Date().toISOString(),
          detectionTime: scenario.expectedDetectionTime + Math.random() * 20,
          remediationTime: scenario.expectedRemediationTime + Math.random() * 10000,
          success: index < count - 1, // Last one is "failure"
          incidentsDetected: scenario.expectedIncidents,
          remediationExecuted: true,
          foundationAlerted: scenario.severity === 'critical',
          escalated: scenario.severity === 'critical',
          timeline: [
            {
              timestamp: new Date().toISOString(),
              phase: 'detection',
              system: 'DNS-023',
              action: 'Detected',
              result: 'success',
            },
          ],
          postMortemCreated: ['critical', 'high'].includes(scenario.severity),
          preventionIssuesCreated: 1,
          metrics: {
            mttr: scenario.expectedRemediationTime / 1000 / 60,
            mttd: scenario.expectedDetectionTime / 1000,
            successRateImpact: scenario.errorMetrics.errorRate,
          },
        })
      );
    };

    it('should summarize successful results', () => {
      const results = createMockResults(4);
      const summary = summarizeWarGameResults(results);

      expect(summary.totalScenarios).toBe(4);
      expect(summary.successfulScenarios).toBe(3);
      expect(summary.avgDetectionTime).toBeGreaterThan(0);
      expect(summary.avgRemediationTime).toBeGreaterThan(0);
      expect(summary.foundationAlertRate).toBeGreaterThan(0);
      expect(summary.postMortemCreationRate).toBeGreaterThan(0);
    });

    it('should calculate accurate rates', () => {
      const results = createMockResults(5);
      const summary = summarizeWarGameResults(results);

      // 4 successful out of 5
      expect(summary.successfulScenarios).toBe(4);
      expect(summary.successfulScenarios / summary.totalScenarios).toBeCloseTo(0.8);

      // Critical scenarios should have high alert/escalation rate
      expect(summary.foundationAlertRate).toBeGreaterThan(0);
      expect(summary.escalationRate).toBeGreaterThan(0);
    });

    it('should handle all scenarios', () => {
      const results = createMockResults(5);
      const summary = summarizeWarGameResults(results);

      expect(summary.totalScenarios).toBe(5);
      expect(summary.avgDetectionTime).toBeLessThan(1000); // Should be in milliseconds, <1s
      expect(summary.postMortemCreationRate).toBeGreaterThan(0.5); // At least for high/critical
    });
  });

  describe('Orchestration Pipeline Coverage', () => {
    it('should cover detection layer (DNS-023)', () => {
      getAllScenarios().forEach((scenario) => {
        expect(scenario.errorMetrics.totalErrors).toBeGreaterThan(0);
        expect(scenario.errorMetrics.errorRate).toBeGreaterThan(0);
      });
    });

    it('should cover analysis layer (DNS-025)', () => {
      getAllScenarios().forEach((scenario) => {
        expect(scenario.errorPatterns.length).toBeGreaterThan(0);
      });
    });

    it('should cover decision layer (DNS-017)', () => {
      getAllScenarios().forEach((scenario) => {
        expect(['deployment', 'database', 'api', 'infrastructure', 'cascading']).toContain(
          scenario.category
        );
      });
    });

    it('should cover remediation layer (DNS-020, DNS-021)', () => {
      getAllScenarios().forEach((scenario) => {
        expect(scenario.expectedRemediationTime).toBeGreaterThan(0);
      });
    });

    it('should cover learning layer (DNS-019, DNS-024)', () => {
      getAllScenarios().forEach((scenario) => {
        expect(scenario.expectedIncidents).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should test critical path: detection → remediation', () => {
      const result: WarGameResult = {
        scenarioName: deploymentMismatchScenario.name,
        executedAt: new Date().toISOString(),
        detectionTime: 45,
        remediationTime: 90000,
        success: true,
        incidentsDetected: 1,
        remediationExecuted: true,
        foundationAlerted: true,
        escalated: true,
        timeline: [
          {
            timestamp: new Date().toISOString(),
            phase: 'detection',
            system: 'DNS-023',
            action: 'Error spike detected',
            result: 'success',
          },
          {
            timestamp: new Date().toISOString(),
            phase: 'analysis',
            system: 'DNS-025',
            action: 'Analyzed regression pattern',
            result: 'success',
          },
          {
            timestamp: new Date().toISOString(),
            phase: 'decision',
            system: 'DNS-017',
            action: 'Decided rollback',
            result: 'success',
          },
          {
            timestamp: new Date().toISOString(),
            phase: 'remediation',
            system: 'DNS-020',
            action: 'Executed rollback',
            result: 'success',
          },
          {
            timestamp: new Date().toISOString(),
            phase: 'verification',
            system: 'DNS-023',
            action: 'Verified error rate recovery',
            result: 'success',
          },
          {
            timestamp: new Date().toISOString(),
            phase: 'learning',
            system: 'DNS-019',
            action: 'Created post-mortem',
            result: 'success',
          },
        ],
        postMortemCreated: true,
        preventionIssuesCreated: 1,
        metrics: {
          mttr: 1.5,
          mttd: 0.045,
          successRateImpact: 23.5,
        },
      };

      const validation = validateWarGameResult(result, deploymentMismatchScenario);
      expect(validation.valid).toBe(true);
      expect(result.timeline).toHaveLength(6); // All phases covered
    });
  });
});
