import { describe, it, expect, beforeEach } from 'vitest';
import {
  logRequest,
  getRequestStats,
  queryLogs,
  getRequestIp,
  __clearLogs,
} from '@/lib/request-logger';

describe('request-logger', () => {
  beforeEach(() => {
    __clearLogs();
  });

  it('logs request with required fields', () => {
    const log = logRequest({
      method: 'POST',
      path: '/api/workspace',
      status: 201,
      latencyMs: 125,
      ip: '192.168.1.1',
    });

    expect(log.method).toBe('POST');
    expect(log.path).toBe('/api/workspace');
    expect(log.status).toBe(201);
    expect(log.latencyMs).toBe(125);
    expect(log.ip).toBe('192.168.1.1');
    expect(log.level).toBe('info');
  });

  it('assigns correct log level by status code', () => {
    const info = logRequest({
      method: 'GET',
      path: '/api/health',
      status: 200,
      latencyMs: 5,
      ip: '127.0.0.1',
    });
    expect(info.level).toBe('info');

    const warn = logRequest({
      method: 'POST',
      path: '/api/workspace',
      status: 400,
      latencyMs: 50,
      ip: '127.0.0.1',
      error: 'Invalid input',
    });
    expect(warn.level).toBe('warn');

    const error = logRequest({
      method: 'GET',
      path: '/api/ai-systems',
      status: 500,
      latencyMs: 1000,
      ip: '127.0.0.1',
      error: 'Database error',
    });
    expect(error.level).toBe('error');
  });

  it('calculates request statistics', () => {
    logRequest({
      method: 'GET',
      path: '/api/workspace',
      status: 200,
      latencyMs: 100,
      ip: '192.168.1.1',
    });
    logRequest({
      method: 'GET',
      path: '/api/workspace',
      status: 200,
      latencyMs: 200,
      ip: '192.168.1.2',
    });
    logRequest({
      method: 'GET',
      path: '/api/workspace',
      status: 500,
      latencyMs: 150,
      ip: '192.168.1.3',
      error: 'Server error',
    });

    const stats = getRequestStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.avgLatencyMs).toBe(150);
    expect(stats.statusDistribution[200]).toBe(2);
    expect(stats.statusDistribution[500]).toBe(1);
    expect(stats.errorRate).toBeCloseTo(0.3333, 3);
  });

  it('tracks path-specific statistics', () => {
    logRequest({
      method: 'POST',
      path: '/api/workspace',
      status: 201,
      latencyMs: 100,
      ip: '192.168.1.1',
    });
    logRequest({
      method: 'POST',
      path: '/api/workspace',
      status: 201,
      latencyMs: 200,
      ip: '192.168.1.2',
    });
    logRequest({
      method: 'GET',
      path: '/api/ai-systems',
      status: 200,
      latencyMs: 50,
      ip: '192.168.1.3',
    });

    const stats = getRequestStats();
    expect(stats.pathStats['/api/workspace'].count).toBe(2);
    expect(stats.pathStats['/api/workspace'].avgLatencyMs).toBe(150);
    expect(stats.pathStats['/api/ai-systems'].count).toBe(1);
    expect(stats.pathStats['/api/ai-systems'].avgLatencyMs).toBe(50);
  });

  it('calculates percentile latencies', () => {
    for (let i = 1; i <= 100; i++) {
      logRequest({
        method: 'GET',
        path: '/api/health',
        status: 200,
        latencyMs: i * 10, // 10ms to 1000ms
        ip: '127.0.0.1',
      });
    }

    const stats = getRequestStats();
    expect(stats.p95LatencyMs).toBeGreaterThanOrEqual(950); // ~95th percentile
    expect(stats.p99LatencyMs).toBeGreaterThanOrEqual(990); // ~99th percentile
  });

  it('tracks top errors', () => {
    for (let i = 0; i < 5; i++) {
      logRequest({
        method: 'POST',
        path: '/api/workspace',
        status: 400,
        latencyMs: 50,
        ip: '192.168.1.1',
        error: 'Invalid company name',
      });
    }
    for (let i = 0; i < 3; i++) {
      logRequest({
        method: 'GET',
        path: '/api/ai-systems',
        status: 500,
        latencyMs: 100,
        ip: '192.168.1.2',
        error: 'Database connection failed',
      });
    }

    const stats = getRequestStats();
    expect(stats.topErrors[0].error).toBe('Invalid company name');
    expect(stats.topErrors[0].count).toBe(5);
    expect(stats.topErrors[1].error).toBe('Database connection failed');
    expect(stats.topErrors[1].count).toBe(3);
  });

  it('queries logs with filtering', () => {
    for (let i = 0; i < 10; i++) {
      logRequest({
        method: 'GET',
        path: '/api/workspace',
        status: i % 2 === 0 ? 200 : 500,
        latencyMs: 50 + i * 10,
        ip: '192.168.1.1',
        userId: i % 3 === 0 ? 'user-1' : 'user-2',
      });
    }

    const all = queryLogs({ limit: 100 });
    expect(all.length).toBe(10);

    const errors = queryLogs({ status: 500 });
    expect(errors.every((l) => l.status === 500)).toBe(true);

    const pathLogs = queryLogs({ path: '/api/workspace' });
    expect(pathLogs.every((l) => l.path.includes('/api/workspace'))).toBe(true);

    const user1Logs = queryLogs({ userId: 'user-1' });
    expect(user1Logs.every((l) => l.userId === 'user-1')).toBe(true);
  });

  it('maintains ring buffer under capacity', () => {
    for (let i = 0; i < 5000; i++) {
      logRequest({
        method: 'GET',
        path: '/api/health',
        status: 200,
        latencyMs: 10,
        ip: '127.0.0.1',
      });
    }

    const stats = getRequestStats();
    expect(stats.totalRequests).toBe(5000);
  });

  it('extracts IP from headers', () => {
    const headers1 = new Headers({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      'user-agent': 'Mozilla/5.0',
    });
    expect(getRequestIp(headers1)).toBe('192.168.1.1');

    const headers2 = new Headers({
      'x-real-ip': '10.0.0.2',
    });
    expect(getRequestIp(headers2)).toBe('10.0.0.2');

    const headers3 = new Headers({
      'user-agent': 'curl',
    });
    expect(getRequestIp(headers3)).toBe('unknown');

    const objectHeaders = {
      'x-forwarded-for': '172.16.0.1, 10.0.0.1',
    };
    expect(getRequestIp(objectHeaders)).toBe('172.16.0.1');
  });
});
