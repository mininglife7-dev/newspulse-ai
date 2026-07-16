import { describe, it, expect, beforeAll } from 'vitest';
import { GET, POST } from '@/app/api/schema-migrations/route';
import { NextRequest } from 'next/server';

// The endpoint is an internal ops surface guarded by ADMIN_TOKEN (lib/api-auth).
const TEST_TOKEN = 'test-admin-token';
beforeAll(() => {
  process.env.ADMIN_TOKEN = TEST_TOKEN;
});

// Helper to create an authenticated NextRequest
function createRequest(
  method: 'GET' | 'POST',
  url: string = 'http://localhost:3000/api/schema-migrations',
  body?: unknown
): NextRequest {
  const options: Record<string, unknown> = {
    method,
    headers: { authorization: `Bearer ${TEST_TOKEN}` },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest(url, options);
}

describe('auth guard', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/schema-migrations')
    );
    expect(response.status).toBe(401);
  });
});

describe('GET /api/schema-migrations', () => {
  it('returns health status by default', async () => {
    const request = createRequest('GET');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('operational');
    expect(json.service).toContain('Schema Migration Validator');
  });

  it('includes feature list in health response', async () => {
    const request = createRequest('GET');
    const response = await GET(request);
    const json = await response.json();

    expect(json.features).toBeDefined();
    expect(Array.isArray(json.features)).toBe(true);
    expect(json.features.length).toBeGreaterThan(0);
  });

  it('includes POST documentation in health response', async () => {
    const request = createRequest('GET');
    const response = await GET(request);
    const json = await response.json();

    expect(json.checkMigrations).toBeDefined();
    expect(json.checkMigrations.method).toBe('POST');
    expect(json.checkMigrations.body).toBeDefined();
  });

  it('returns example analysis on ?mode=example', async () => {
    const request = createRequest(
      'GET',
      'http://localhost:3000/api/schema-migrations?mode=example'
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.files).toBeDefined();
    expect(Array.isArray(json.files)).toBe(true);
    expect(json.overallRisk).toBeDefined();
  });

  it('includes batch metadata in example response', async () => {
    const request = createRequest(
      'GET',
      'http://localhost:3000/api/schema-migrations?mode=example'
    );
    const response = await GET(request);
    const json = await response.json();

    expect(json.timestamp).toBeDefined();
    expect(json.blocksCI).toBeDefined();
    expect(json.files.length).toBeGreaterThan(0);
  });

  it('returns error for invalid mode', async () => {
    const request = createRequest(
      'GET',
      'http://localhost:3000/api/schema-migrations?mode=invalid'
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid mode');
    expect(json.supportedModes).toBeDefined();
  });
});

describe('POST /api/schema-migrations', () => {
  it('analyzes safe migrations and returns 200', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'safe.sql',
            sql: 'CREATE TABLE users (id BIGINT PRIMARY KEY);',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.files).toBeDefined();
    expect(json.overallRisk).toBe('safe');
    expect(json.blocksCI).toBe(false);
  });

  it('analyzes dangerous migrations and returns 400 with blocksCI flag', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'dangerous.sql',
            sql: 'DROP TABLE users;',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.blocksCI).toBe(true);
    expect(json.overallRisk).toBe('breaking');
  });

  it('returns error for missing migrations field', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        // No migrations field
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid request body');
  });

  it('returns error when migrations is not an array', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: 'not an array',
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid request body');
  });

  it('returns error when migration missing name field', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            sql: 'CREATE TABLE t (id BIGINT);',
            // No name field
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('name');
  });

  it('returns error when migration missing sql field', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'test.sql',
            // No sql field
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('sql');
  });

  it('analyzes multiple migrations together', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: '001_create.sql',
            sql: 'CREATE TABLE users (id BIGINT PRIMARY KEY);',
          },
          {
            name: '002_add_email.sql',
            sql: "ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT '';",
          },
          {
            name: '003_index.sql',
            sql: 'CREATE INDEX idx_email ON users(email);',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.files).toHaveLength(3);
    expect(json.files[0].name).toBe('001_create.sql');
  });

  it('flags batch as breaking when any file is breaking', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'safe.sql',
            sql: 'CREATE TABLE t (id BIGINT);',
          },
          {
            name: 'breaking.sql',
            sql: 'DROP TABLE users;',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.overallRisk).toBe('breaking');
    expect(json.blocksCI).toBe(true);
  });

  it('accepts optional timestamp parameter', async () => {
    const timestamp = '2026-07-10T10:00:00Z';
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'test.sql',
            sql: 'CREATE TABLE t (id BIGINT);',
            timestamp,
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.files[0].timestamp).toBe(timestamp);
  });

  it('includes analysis timestamp in response', async () => {
    const before = new Date();
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'test.sql',
            sql: 'CREATE TABLE t (id BIGINT);',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();
    const after = new Date();

    expect(json.timestamp).toBeDefined();
    const batchTime = new Date(json.timestamp);
    expect(batchTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(batchTime.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('includes issues in file reports', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'problematic.sql',
            sql: 'ALTER TABLE users ADD COLUMN status TEXT NOT NULL;',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(json.files[0].issues).toBeDefined();
    expect(Array.isArray(json.files[0].issues)).toBe(true);
    expect(json.files[0].issues.length).toBeGreaterThan(0);
  });

  it('handles empty migrations array gracefully', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.files).toHaveLength(0);
    expect(json.overallRisk).toBe('safe');
    expect(json.blocksCI).toBe(false);
  });

  it('reports analysis details for high-risk migrations', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'modify_column.sql',
            sql: 'ALTER TABLE users ALTER COLUMN email TYPE BIGINT;',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.files[0].riskLevel).toBe('high-risk');
    expect(json.files[0].issues.length).toBeGreaterThan(0);
    expect(json.files[0].safeExecutionStrategy).toBeTruthy();
  });

  it('includes canAutoMerge flag in analysis results', async () => {
    const request = createRequest(
      'POST',
      'http://localhost:3000/api/schema-migrations',
      {
        migrations: [
          {
            name: 'safe.sql',
            sql: 'CREATE TABLE t (id BIGINT);',
          },
        ],
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(json.files[0].canAutoMerge).toBeDefined();
    expect(typeof json.files[0].canAutoMerge).toBe('boolean');
  });

  it('returns 500 on malformed JSON input', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/schema-migrations',
      {
        method: 'POST',
        headers: { authorization: `Bearer ${TEST_TOKEN}` },
        body: 'invalid json {',
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toContain('Failed');
  });
});
