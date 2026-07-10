import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyRegionHealth,
  detectRegionalFailures,
  determineFailoverAction,
  calculateTrafficDistribution,
  generateMultiRegionReport,
  formatMultiRegionReport,
  recordRegionStatus,
  getMultiRegionStatus,
  resetRegionStatus,
  getAvailableRegions,
  type RegionHealthMetrics,
} from '@/lib/multi-region-failover';

describe('Multi-Region Failover', () => {
  beforeEach(() => {
    resetRegionStatus();
  });

  describe('classifyRegionHealth', () => {
    it('should classify healthy region', () => {
      const metrics: RegionHealthMetrics = {
        region: 'us-east',
        timestamp: new Date().toISOString(),
        latency_p99_ms: 500,
        error_rate_percent: 0.5,
        availability_percent: 99.9,
        cpu_percent: 50,
        memory_percent: 60,
        database_connections: 100,
        active_users: 5000,
      };

      const status = classifyRegionHealth(metrics);
      expect(status).toBe('healthy');
    });

    it('should classify degraded region by latency', () => {
      const metrics: RegionHealthMetrics = {
        region: 'us-west',
        timestamp: new Date().toISOString(),
        latency_p99_ms: 3000,
        error_rate_percent: 0.5,
        availability_percent: 99.9,
        cpu_percent: 50,
        memory_percent: 60,
        database_connections: 100,
        active_users: 5000,
      };

      const status = classifyRegionHealth(metrics);
      expect(status).toBe('degraded');
    });

    it('should classify degraded region by error rate', () => {
      const metrics: RegionHealthMetrics = {
        region: 'eu-west',
        timestamp: new Date().toISOString(),
        latency_p99_ms: 500,
        error_rate_percent: 5,
        availability_percent: 99.9,
        cpu_percent: 50,
        memory_percent: 60,
        database_connections: 100,
        active_users: 5000,
      };

      const status = classifyRegionHealth(metrics);
      expect(status).toBe('degraded');
    });

    it('should classify critical region by error rate', () => {
      const metrics: RegionHealthMetrics = {
        region: 'ap-south',
        timestamp: new Date().toISOString(),
        latency_p99_ms: 500,
        error_rate_percent: 15,
        availability_percent: 99.9,
        cpu_percent: 50,
        memory_percent: 60,
        database_connections: 100,
        active_users: 5000,
      };

      const status = classifyRegionHealth(metrics);
      expect(status).toBe('critical');
    });

    it('should classify critical region by availability', () => {
      const metrics: RegionHealthMetrics = {
        region: 'sa-east',
        timestamp: new Date().toISOString(),
        latency_p99_ms: 500,
        error_rate_percent: 0.5,
        availability_percent: 88,
        cpu_percent: 50,
        memory_percent: 60,
        database_connections: 100,
        active_users: 5000,
      };

      const status = classifyRegionHealth(metrics);
      expect(status).toBe('critical');
    });

    it('should classify critical region by latency', () => {
      const metrics: RegionHealthMetrics = {
        region: 'us-east',
        timestamp: new Date().toISOString(),
        latency_p99_ms: 6000,
        error_rate_percent: 0.5,
        availability_percent: 99.9,
        cpu_percent: 50,
        memory_percent: 60,
        database_connections: 100,
        active_users: 5000,
      };

      const status = classifyRegionHealth(metrics);
      expect(status).toBe('critical');
    });
  });

  describe('detectRegionalFailures', () => {
    it('should detect all healthy regions', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'us-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 500,
          error_rate_percent: 0.5,
          availability_percent: 99.9,
          cpu_percent: 50,
          memory_percent: 60,
          database_connections: 100,
          active_users: 5000,
        },
        {
          region: 'us-west',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 450,
          error_rate_percent: 0.3,
          availability_percent: 99.95,
          cpu_percent: 45,
          memory_percent: 55,
          database_connections: 90,
          active_users: 4500,
        },
      ];

      const statuses = detectRegionalFailures(metrics);

      expect(statuses.filter((s) => s.status === 'healthy')).toHaveLength(2);
      expect(statuses.every((s) => s.failoverEligible)).toBe(true);
    });

    it('should detect mixed healthy and degraded regions', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'us-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 500,
          error_rate_percent: 0.5,
          availability_percent: 99.9,
          cpu_percent: 50,
          memory_percent: 60,
          database_connections: 100,
          active_users: 5000,
        },
        {
          region: 'eu-west',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 3500,
          error_rate_percent: 4,
          availability_percent: 94,
          cpu_percent: 80,
          memory_percent: 70,
          database_connections: 150,
          active_users: 3000,
        },
      ];

      const statuses = detectRegionalFailures(metrics);

      expect(statuses.filter((s) => s.status === 'healthy')).toHaveLength(1);
      expect(statuses.filter((s) => s.status === 'degraded')).toHaveLength(1);
    });

    it('should detect critical regions', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'ap-south',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 7000,
          error_rate_percent: 20,
          availability_percent: 85,
          cpu_percent: 95,
          memory_percent: 90,
          database_connections: 250,
          active_users: 1000,
        },
      ];

      const statuses = detectRegionalFailures(metrics);

      expect(statuses.filter((s) => s.status === 'critical')).toHaveLength(1);
      expect(statuses[0].failoverEligible).toBe(false);
    });

    it('should include failover reason in critical regions', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'sa-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 500,
          error_rate_percent: 0.5,
          availability_percent: 87,
          cpu_percent: 50,
          memory_percent: 60,
          database_connections: 100,
          active_users: 5000,
        },
      ];

      const statuses = detectRegionalFailures(metrics);

      expect(statuses[0].failoverReason).toBeDefined();
      expect(statuses[0].failoverReason).toContain('Critical');
    });
  });

  describe('determineFailoverAction', () => {
    it('should return none when all healthy', () => {
      const statuses = [
        { region: 'us-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'us-west' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'eu-west' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'ap-south' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'sa-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
      ];

      const action = determineFailoverAction(statuses);
      expect(action).toBe('none');
    });

    it('should return monitor for single degraded region', () => {
      const statuses = [
        { region: 'us-east' as const, status: 'degraded' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 20 },
        { region: 'us-west' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'eu-west' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'ap-south' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'sa-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
      ];

      const action = determineFailoverAction(statuses);
      expect(action).toBe('monitor');
    });

    it('should return scale-up for multiple degraded regions', () => {
      const statuses = [
        { region: 'us-east' as const, status: 'degraded' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 15 },
        { region: 'us-west' as const, status: 'degraded' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 15 },
        { region: 'eu-west' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'ap-south' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'sa-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
      ];

      const action = determineFailoverAction(statuses);
      expect(action).toBe('scale-up');
    });

    it('should return failover for multiple critical regions with healthy regions', () => {
      const statuses = [
        { region: 'us-east' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 5 },
        { region: 'us-west' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 5 },
        { region: 'eu-west' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 30 },
        { region: 'ap-south' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 30 },
        { region: 'sa-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 30 },
      ];

      const action = determineFailoverAction(statuses);
      expect(action).toBe('failover');
    });

    it('should return escalate when all regions critical', () => {
      const statuses = [
        { region: 'us-east' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 10 },
        { region: 'us-west' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 10 },
        { region: 'eu-west' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 10 },
        { region: 'ap-south' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 10 },
        { region: 'sa-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 60 },
      ];

      const action = determineFailoverAction(statuses);
      expect(action).toBe('escalate');
    });
  });

  describe('calculateTrafficDistribution', () => {
    it('should distribute traffic to healthy regions', () => {
      const statuses = [
        { region: 'us-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'us-west' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
        { region: 'eu-west' as const, status: 'degraded' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 15 },
        { region: 'ap-south' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 5 },
        { region: 'sa-east' as const, status: 'healthy' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 25 },
      ];

      const distribution = calculateTrafficDistribution(statuses);

      // Healthy regions should get ~70%, degraded ~20%, critical ~10%
      const healthyTotal = (distribution['us-east'] || 0) + (distribution['us-west'] || 0) + (distribution['sa-east'] || 0);
      expect(healthyTotal).toBeGreaterThan(50);

      // Total should sum to 100
      const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
      expect(Math.round(total)).toBe(100);
    });

    it('should fallback when no healthy regions', () => {
      const statuses = [
        { region: 'us-east' as const, status: 'degraded' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 15 },
        { region: 'us-west' as const, status: 'degraded' as const, lastUpdated: '', failoverEligible: true, trafficPercentage: 15 },
        { region: 'eu-west' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 5 },
        { region: 'ap-south' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 5 },
        { region: 'sa-east' as const, status: 'critical' as const, lastUpdated: '', failoverEligible: false, trafficPercentage: 5 },
      ];

      const distribution = calculateTrafficDistribution(statuses);

      // Should distribute equally among all regions
      const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
      expect(Math.round(total)).toBe(100);
      expect(Object.keys(distribution).length).toBe(5);
    });
  });

  describe('generateMultiRegionReport', () => {
    it('should generate report with all healthy regions', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'us-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 500,
          error_rate_percent: 0.5,
          availability_percent: 99.9,
          cpu_percent: 50,
          memory_percent: 60,
          database_connections: 100,
          active_users: 5000,
        },
        {
          region: 'us-west',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 450,
          error_rate_percent: 0.3,
          availability_percent: 99.95,
          cpu_percent: 45,
          memory_percent: 55,
          database_connections: 90,
          active_users: 4500,
        },
      ];

      const report = generateMultiRegionReport(metrics);

      expect(report.overallStatus).toBe('healthy');
      expect(report.healthyRegions.length).toBe(2);
      expect(report.criticalRegions.length).toBe(0);
      expect(report.failoverTriggered).toBe(false);
    });

    it('should generate report with degraded regions', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'us-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 3000,
          error_rate_percent: 4,
          availability_percent: 94,
          cpu_percent: 80,
          memory_percent: 70,
          database_connections: 150,
          active_users: 3000,
        },
        {
          region: 'us-west',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 450,
          error_rate_percent: 0.3,
          availability_percent: 99.95,
          cpu_percent: 45,
          memory_percent: 55,
          database_connections: 90,
          active_users: 4500,
        },
      ];

      const report = generateMultiRegionReport(metrics);

      expect(report.overallStatus).toBe('degraded');
      expect(report.degradedRegions.length).toBeGreaterThan(0);
    });

    it('should trigger failover with critical regions', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'us-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 7000,
          error_rate_percent: 20,
          availability_percent: 85,
          cpu_percent: 95,
          memory_percent: 90,
          database_connections: 250,
          active_users: 1000,
        },
        {
          region: 'us-west',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 450,
          error_rate_percent: 0.3,
          availability_percent: 99.95,
          cpu_percent: 45,
          memory_percent: 55,
          database_connections: 90,
          active_users: 4500,
        },
      ];

      const report = generateMultiRegionReport(metrics);

      expect(report.overallStatus).toBe('critical');
      expect(report.criticalRegions.length).toBeGreaterThan(0);
      if (report.criticalRegions.length > 0) {
        expect(report.failoverTriggered).toBe(true);
      }
    });

    it('should calculate affected users correctly', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'us-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 7000,
          error_rate_percent: 20,
          availability_percent: 85,
          cpu_percent: 95,
          memory_percent: 90,
          database_connections: 250,
          active_users: 3000,
        },
        {
          region: 'us-west',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 450,
          error_rate_percent: 0.3,
          availability_percent: 99.95,
          cpu_percent: 45,
          memory_percent: 55,
          database_connections: 90,
          active_users: 4500,
        },
      ];

      const report = generateMultiRegionReport(metrics);

      expect(report.affectedUsers).toBe(3000);
    });
  });

  describe('formatMultiRegionReport', () => {
    it('should format report as markdown', () => {
      const metrics: RegionHealthMetrics[] = [
        {
          region: 'us-east',
          timestamp: new Date().toISOString(),
          latency_p99_ms: 500,
          error_rate_percent: 0.5,
          availability_percent: 99.9,
          cpu_percent: 50,
          memory_percent: 60,
          database_connections: 100,
          active_users: 5000,
        },
      ];

      const report = generateMultiRegionReport(metrics);
      const formatted = formatMultiRegionReport(report);

      expect(formatted).toContain('# Multi-Region Status Report');
      expect(formatted).toContain('Regional Health');
      expect(formatted).toContain('Traffic Distribution');
      expect(formatted).toContain('Recommendations');
    });
  });

  describe('region status tracking', () => {
    it('should record and retrieve region status', () => {
      recordRegionStatus('us-east', {
        region: 'us-east',
        status: 'healthy',
        lastUpdated: new Date().toISOString(),
        failoverEligible: true,
        trafficPercentage: 25,
      });

      const statuses = getMultiRegionStatus();
      expect(statuses.length).toBeGreaterThan(0);
      const usEast = statuses.find((s) => s.region === 'us-east');
      expect(usEast?.status).toBe('healthy');
    });
  });

  describe('available regions', () => {
    it('should return all available regions', () => {
      const regions = getAvailableRegions();
      expect(regions).toContain('us-east');
      expect(regions).toContain('us-west');
      expect(regions).toContain('eu-west');
      expect(regions).toContain('ap-south');
      expect(regions).toContain('sa-east');
      expect(regions).toHaveLength(5);
    });
  });
});
