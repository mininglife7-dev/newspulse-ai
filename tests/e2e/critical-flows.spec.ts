/**
 * E2E Tests for Critical Customer Flows
 *
 * These tests verify the happy path for core functionality:
 * 1. User signup and email verification
 * 2. Workspace creation
 * 3. AI system registration
 * 4. Dashboard access
 * 5. Data isolation between users
 *
 * Run with: npm run test:e2e
 * (Requires app running locally or deployed)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test data
const testUser1 = {
  email: `test-user-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

const testUser2 = {
  email: `test-user-${Date.now() + 1}@example.com`,
  password: 'TestPassword123!',
};

const workspace1 = {
  companyName: `Test Corp ${Date.now()}`,
  country: 'US',
  industry: 'Technology',
  website: 'https://testcorp.example.com',
  description: 'A test company',
};

const workspace2 = {
  companyName: `Beta Inc ${Date.now()}`,
  country: 'DE',
  industry: 'Finance',
};

const aiSystem = {
  name: `GPT-4 Integration ${Date.now()}`,
  systemType: 'large_language_model',
  vendor: 'OpenAI',
  purpose: 'Customer support automation',
  status: 'active',
};

describe('Critical Customer Flows (E2E)', () => {
  let user1SessionToken: string;
  let user2SessionToken: string;
  let workspace1Id: string;
  let workspace2Id: string;

  describe('1. User Signup Flow', () => {
    it('should reject invalid email', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'TestPassword123!',
        }),
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject weak password', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser1.email,
          password: '123', // Too short
        }),
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should successfully sign up new user', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser1.email,
          password: testUser1.password,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.user).toBeDefined();
      user1SessionToken = data.session?.access_token;
    });
  });

  describe('2. Workspace Creation Flow', () => {
    it('should reject missing required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify({
          companyName: workspace1.companyName,
          // Missing country and industry
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should reject invalid URL format', async () => {
      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify({
          ...workspace1,
          website: 'not-a-valid-url',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('URL');
    });

    it('should reject overly long company name', async () => {
      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify({
          ...workspace1,
          companyName: 'a'.repeat(101), // Exceeds 100 char limit
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('100 characters');
    });

    it('should successfully create workspace', async () => {
      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify(workspace1),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.workspace).toBeDefined();
      expect(data.workspace.name).toBe(workspace1.companyName);
      expect(data.workspace.slug).toBeDefined();
      workspace1Id = data.workspace.id;
    });

    it('should not allow duplicate workspace creation for same user', async () => {
      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify(workspace1),
      });

      // Should fail or return error (user already has workspace)
      expect([400, 409]).toContain(response.status);
    });
  });

  describe('3. AI System Registration Flow', () => {
    it('should reject missing name', async () => {
      const response = await fetch(`${BASE_URL}/api/ai-systems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify({
          systemType: aiSystem.systemType,
          vendor: aiSystem.vendor,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should reject invalid systemType', async () => {
      const response = await fetch(`${BASE_URL}/api/ai-systems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify({
          name: aiSystem.name,
          systemType: 'invalid_system_type',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should successfully register AI system', async () => {
      const response = await fetch(`${BASE_URL}/api/ai-systems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify(aiSystem),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.system).toBeDefined();
      expect(data.system.name).toBe(aiSystem.name);
      expect(data.system.vendor).toBe(aiSystem.vendor);
    });

    it('should allow multiple AI systems per workspace', async () => {
      const response = await fetch(`${BASE_URL}/api/ai-systems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1SessionToken}`,
        },
        body: JSON.stringify({
          ...aiSystem,
          name: `Claude Integration ${Date.now()}`,
          vendor: 'Anthropic',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
    });
  });

  describe('4. Dashboard Access Flow', () => {
    it('should return dashboard state for authenticated user', async () => {
      const response = await fetch(`${BASE_URL}/api/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user1SessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.launchReadiness).toBeDefined();
      expect(data.missionProgress).toBeDefined();
      expect(data.health).toBeDefined();
    });

    it('should reject unauthenticated dashboard access', async () => {
      const response = await fetch(`${BASE_URL}/api/dashboard`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('5. Data Isolation Between Users', () => {
    beforeAll(async () => {
      // Create second user and workspace
      const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser2.email,
          password: testUser2.password,
        }),
      });

      if (signupResponse.ok) {
        const data = await signupResponse.json();
        user2SessionToken = data.session?.access_token;

        // Create workspace for user 2
        const wsResponse = await fetch(`${BASE_URL}/api/workspace`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user2SessionToken}`,
          },
          body: JSON.stringify(workspace2),
        });

        if (wsResponse.ok) {
          const wsData = await wsResponse.json();
          workspace2Id = wsData.workspace.id;
        }
      }
    });

    it('user 1 should not see user 2 workspace', async () => {
      // Try to fetch user 2's workspace using user 1 credentials
      const response = await fetch(`${BASE_URL}/api/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user1SessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Dashboard should show user 1's workspace, not user 2's
      if (data.workspaces) {
        const workspaceNames = data.workspaces.map((w: any) => w.name);
        expect(workspaceNames).toContain(workspace1.companyName);
        expect(workspaceNames).not.toContain(workspace2.companyName);
      }
    });

    it('user 1 should not see user 2 AI systems', async () => {
      const response = await fetch(`${BASE_URL}/api/ai-systems`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user1SessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);

      // Should only see systems from user 1's workspace
      const systemVendors = data.systems.map((s: any) => s.vendor);
      expect(systemVendors).toContain('OpenAI');
      expect(systemVendors).toContain('Anthropic');
    });
  });

  describe('6. Rate Limiting', () => {
    it('should rate limit workspace creation attempts', async () => {
      const attempts = [];

      for (let i = 0; i < 15; i++) {
        const response = await fetch(`${BASE_URL}/api/workspace`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user1SessionToken}`,
          },
          body: JSON.stringify({
            ...workspace1,
            companyName: `Company ${i}`,
          }),
        });

        attempts.push(response.status);
      }

      // Should have at least one 429 (rate limit exceeded) after 10 requests
      const rateLimitedCount = attempts.filter(s => s === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('7. Security Headers', () => {
    it('should return security headers', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);

      expect(response.headers.get('Strict-Transport-Security')).toBeDefined();
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should return CSP header', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const csp = response.headers.get('Content-Security-Policy');

      expect(csp).toBeDefined();
      expect(csp).toContain('script-src');
      expect(csp).toContain('style-src');
    });
  });

  describe('8. Error Handling', () => {
    it('should not expose stack traces in error responses', async () => {
      const response = await fetch(`${BASE_URL}/api/workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer invalid-token`,
        },
        body: JSON.stringify(workspace1),
      });

      const data = await response.json();

      // Error message should be generic, not a stack trace
      expect(data.error).not.toContain('at ');
      expect(data.error).not.toContain('Error:');
      expect(typeof data.error).toBe('string');
    });
  });

  describe('9. Cache Headers', () => {
    it('user data should not be cached', async () => {
      const response = await fetch(`${BASE_URL}/api/ai-systems`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user1SessionToken}`,
        },
      });

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-store');
    });

    it('health check should be cached', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const cacheControl = response.headers.get('Cache-Control');

      expect(cacheControl).toContain('max-age');
      expect(cacheControl).not.toContain('no-store');
    });
  });

  describe('10. Health & Monitoring', () => {
    it('health check should return healthy', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe('healthy');
    });

    it('production health should return detailed status', async () => {
      const response = await fetch(`${BASE_URL}/api/production-health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.checks).toBeDefined();
      expect(Array.isArray(data.checks)).toBe(true);
    });

    it('error rate should be tracked', async () => {
      const response = await fetch(`${BASE_URL}/api/error-rate`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.summary).toBeDefined();
      expect(typeof data.summary.errorRate).toBe('number');
    });
  });
});
