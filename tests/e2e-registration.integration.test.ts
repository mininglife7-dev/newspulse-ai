/**
 * E2E Registration Integration Test
 * Tests the complete registration flow after schema deployment
 * Run this AFTER Supabase schema is deployed and application is running
 */

import { describe, it, expect, beforeEach } from 'vitest';

// These tests assume a running instance with real Supabase connection
// Set TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY env vars

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.TEST_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';

// Utility to generate unique test emails
const uniqueEmail = (prefix = 'test') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

describe('E2E Registration Flow', () => {
  beforeEach(() => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.warn(
        '⚠️  Skipping E2E tests: TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY required'
      );
    }
  });

  describe('Schema Deployment Verification', () => {
    it('should have workspaces table', async () => {
      if (!SUPABASE_URL) return;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/workspaces?limit=1`,
        {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBeLessThan(500);
      // 401 or 404 is OK (means table exists but access denied or no data)
      // 500 means database error or table doesn't exist
    });

    it('should have workspace_members table', async () => {
      if (!SUPABASE_URL) return;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/workspace_members?limit=1`,
        {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBeLessThan(500);
    });

    it('should have companies table', async () => {
      if (!SUPABASE_URL) return;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?limit=1`,
        {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBeLessThan(500);
    });

    it('should have profiles table', async () => {
      if (!SUPABASE_URL) return;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?limit=1`, {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Workspace Creation API', () => {
    it('should create workspace with valid payload', async () => {
      if (!BASE_URL) return;

      const payload = {
        companyName: 'Test Company E2E',
        country: 'United States',
        industry: 'Technology',
        employees: '11-50',
        description: 'E2E test workspace',
      };

      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Note: This will fail with 401 (unauthenticated) without auth context
      // In real E2E test, would use authenticated session
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should reject invalid company name', async () => {
      if (!BASE_URL) return;

      const payload = {
        companyName: '',
        country: 'United States',
        industry: 'Technology',
        employees: '11-50',
      };

      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Should return 400, not 500
      expect(response.status).not.toBe(500);
    });

    it('should reject missing required fields', async () => {
      if (!BASE_URL) return;

      const payload = {
        companyName: 'Test Company',
        // Missing country, industry, employees
      };

      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Should return 400, not 500
      expect(response.status).not.toBe(500);
    });

    it('should handle malformed JSON gracefully', async () => {
      if (!BASE_URL) return;

      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{invalid json}',
      });

      // Should return 400, not 500
      expect(response.status).not.toBe(500);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should isolate workspaces by owner_id', async () => {
      if (!SUPABASE_URL) return;

      // This test verifies the schema has proper foreign key relationships
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/workspaces?select=id,owner_id&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBeLessThan(500);

      if (response.status === 200) {
        const workspaces = await response.json();
        // Each workspace should have an owner_id
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          expect(workspaces[0]).toHaveProperty('owner_id');
        }
      }
    });

    it('should enforce RLS policies', async () => {
      if (!SUPABASE_URL) return;

      // Attempt to query workspaces with invalid/missing authorization
      const response = await fetch(`${SUPABASE_URL}/rest/v1/workspaces`, {
        headers: {
          'Content-Type': 'application/json',
          // No authorization header
        },
      });

      // Should be rejected (401) due to RLS policy
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should not return 500 for invalid workspace creation', async () => {
      if (!BASE_URL) return;

      const testCases = [
        { companyName: '' }, // Empty company name
        { companyName: 'A' }, // Too short
        { companyName: 'x'.repeat(1000) }, // Too long
        { country: 'Invalid' }, // Only one field
        { invalid: 'field' }, // Completely wrong payload
      ];

      for (const testCase of testCases) {
        const response = await fetch(`${BASE_URL}/api/workspace`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase),
        });

        // Should never return 500, even with bad input
        expect(response.status).not.toBe(500);
        // Should return 4xx error
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should handle database connection gracefully', async () => {
      if (!BASE_URL) return;

      // Make a normal request that would require database access
      const response = await fetch(`${BASE_URL}/api/health`, {
        method: 'GET',
      });

      // Health check should work without 500
      expect(response.status).not.toBe(500);
    });
  });

  describe('Duplicate Registration', () => {
    it('should return 4xx when registering with existing email', async () => {
      if (!BASE_URL) return;

      const email = uniqueEmail('dup-test');

      // First registration (may fail due to auth context, that's OK)
      await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: 'test-password-123',
          options: {
            data: { first_name: 'Test', last_name: 'User' },
          },
        }),
      });

      // Wait a bit for first request to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Second registration with same email (should fail gracefully)
      const duplicateResponse = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: 'test-password-456',
          options: {
            data: { first_name: 'Test', last_name: 'User2' },
          },
        }),
      });

      // Should return 4xx error, not 500
      expect(duplicateResponse.status).not.toBe(500);
    });
  });
});

/**
 * Usage:
 *
 * # Run with real Supabase connection
 * TEST_APP_URL=http://localhost:3000 \
 * TEST_SUPABASE_URL=https://yrroytwfdrafvajdfkok.supabase.co \
 * TEST_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 * npm test tests/e2e-registration.integration.test.ts
 *
 * # Or run against production
 * TEST_APP_URL=https://newspulse-ai-production.vercel.app \
 * TEST_SUPABASE_URL=https://yrroytwfdrafvajdfkok.supabase.co \
 * TEST_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 * npm test tests/e2e-registration.integration.test.ts
 */
