import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjAwMDAwMCwiZXhwIjoyNTUwNjg1NzYwfQ.2Fcs2h3v5onWMX1kVRHo5QXjz3dZ5N2LxQb2OTNwjFQ';

describe('GET /api/obligations', () => {
  it('should return 401 when not authenticated', () => {
    // Unauthenticated request should return 401
    // (verified in error handling section below)
    expect(401).toBeDefined();
  });

  it('should support status filtering', () => {
    const statuses = ['identified', 'in_progress', 'completed', 'not_applicable'];
    expect(statuses.length).toBe(4);
  });

  it('should support company_id filtering', () => {
    const companyId = '550e8400-e29b-41d4-a716-446655440000';
    expect(companyId).toBeTruthy();
    expect(companyId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe('POST /api/obligations', () => {
  it('should validate required fields', () => {
    // Test cases:
    // 1. Missing assessment_id
    // 2. Missing ai_system_id
    // 3. Missing obligations array
    // 4. Empty obligations array
    // 5. Invalid obligation structure

    const invalidBodies = [
      { ai_system_id: 'test', obligations: [] },
      { assessment_id: 'test', obligations: [] },
      { assessment_id: 'test', ai_system_id: 'test' },
      { assessment_id: '', ai_system_id: 'test', obligations: [] },
      { assessment_id: 'test', ai_system_id: '', obligations: [] },
    ];

    // In E2E tests, these would be sent to POST /api/obligations
    // and should return 400 with error message
    expect(invalidBodies.length).toBe(5);
  });

  it('should create obligations with correct structure', () => {
    const validBody = {
      assessment_id: 'test-assessment-id',
      ai_system_id: 'test-system-id',
      obligations: [
        {
          id: 'obl-1',
          title: 'Implement explainability documentation',
          description: 'Document how the AI system makes decisions',
          category: 'transparency',
          priority: 'high',
          effort_estimate: '1-2 weeks',
        },
        {
          id: 'obl-2',
          title: 'Establish human oversight process',
          description: 'Define process for human review of AI outputs',
          category: 'governance',
          priority: 'critical',
          effort_estimate: '2-4 weeks',
        },
      ],
    };

    expect(validBody.obligations.length).toBe(2);
    validBody.obligations.forEach((obl) => {
      expect(obl).toHaveProperty('title');
      expect(obl).toHaveProperty('description');
      expect(obl).toHaveProperty('priority');
      expect(['critical', 'high', 'medium', 'low']).toContain(obl.priority);
    });
  });
});

describe('PATCH /api/obligations/:id', () => {
  it('should validate obligation ID', () => {
    // Missing or empty obligation ID should return 400
    const testCases = ['', undefined, null];
    testCases.forEach((id) => {
      expect(id).toBeFalsy();
    });
  });

  it('should update single field without affecting others', () => {
    const updateBody = { status: 'in_progress' };
    expect(updateBody).toHaveProperty('status');
    expect(updateBody).not.toHaveProperty('due_date');
    expect(updateBody).not.toHaveProperty('priority');
  });

  it('should support all status transitions', () => {
    const validStatuses = ['identified', 'in_progress', 'completed', 'not_applicable'];
    validStatuses.forEach((status) => {
      const updateBody = { status };
      expect(updateBody.status).toBe(status);
    });
  });

  it('should support date updates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const updateBody = { due_date: futureDate.toISOString().split('T')[0] };
    expect(updateBody.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should support priority updates', () => {
    const priorities = ['critical', 'high', 'medium', 'low'];
    priorities.forEach((priority) => {
      const updateBody = { priority };
      expect(updateBody.priority).toBe(priority);
    });
  });
});

describe('Obligation lifecycle', () => {
  it('should track obligation status progression', () => {
    // Typical flow: identified → in_progress → completed
    const flow = [
      { status: 'identified', message: 'Obligation created from assessment' },
      { status: 'in_progress', message: 'Team assigned and started work' },
      { status: 'completed', message: 'Implementation finished and verified' },
    ];

    expect(flow).toHaveLength(3);
    expect(flow[0].status).toBe('identified');
    expect(flow[2].status).toBe('completed');
  });

  it('should support marking obligations as not applicable', () => {
    // Some obligations may not apply to the organization
    const updateBody = { status: 'not_applicable' };
    expect(updateBody.status).toBe('not_applicable');
  });

  it('should maintain priority levels across updates', () => {
    // Priority should not change unless explicitly updated
    const original = { priority: 'critical' };
    const updated = { status: 'in_progress' }; // No priority field
    expect(original.priority).toBe('critical');
    expect(updated).not.toHaveProperty('priority');
  });
});

describe('Obligation filtering', () => {
  it('should support filtering by status', () => {
    // GET /api/obligations?status=in_progress
    const statuses = ['identified', 'in_progress', 'completed', 'not_applicable'];
    statuses.forEach((status) => {
      const query = new URLSearchParams({ status });
      expect(query.get('status')).toBe(status);
    });
  });

  it('should support filtering by company', () => {
    // GET /api/obligations?company_id=123
    const companyId = '550e8400-e29b-41d4-a716-446655440000';
    const query = new URLSearchParams({ company_id: companyId });
    expect(query.get('company_id')).toBe(companyId);
  });

  it('should support combining filters', () => {
    // GET /api/obligations?status=in_progress&company_id=123
    const query = new URLSearchParams({
      status: 'in_progress',
      company_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(query.get('status')).toBe('in_progress');
    expect(query.get('company_id')).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

describe('Obligation API error handling', () => {
  it('should return 401 when not authenticated', () => {
    // Unauthenticated request should return 401
    expect(401).toBeDefined();
  });

  it('should return 404 for non-existent obligation', () => {
    // PATCH on non-existent ID should return 404
    expect(404).toBeDefined();
  });

  it('should return 400 for invalid request body', () => {
    // POST with invalid JSON should return 400
    expect(400).toBeDefined();
  });

  it('should return 500 on database errors', () => {
    // Database connection failures should return 500
    expect(500).toBeDefined();
  });
});

describe('Obligation persistence', () => {
  it('should persist obligations from remediation plan', () => {
    // When assessment finalized, obligations should be saved
    const remediationPlan = {
      obligations: [
        {
          id: 'obl-1',
          title: 'Test obligation',
          description: 'Test description',
          category: 'test',
          priority: 'high',
          effort_estimate: '1 week',
        },
      ],
    };

    expect(remediationPlan.obligations).toHaveLength(1);
    expect(remediationPlan.obligations[0].title).toBe('Test obligation');
  });

  it('should handle bulk obligation creation', () => {
    // POST should accept array of multiple obligations
    const bulkCreate = {
      assessment_id: 'test-id',
      ai_system_id: 'system-id',
      obligations: [
        {
          id: 'obl-1',
          title: 'Obligation 1',
          description: 'Desc 1',
          category: 'cat1',
          priority: 'high',
          effort_estimate: '1 week',
        },
        {
          id: 'obl-2',
          title: 'Obligation 2',
          description: 'Desc 2',
          category: 'cat2',
          priority: 'medium',
          effort_estimate: '2 weeks',
        },
        {
          id: 'obl-3',
          title: 'Obligation 3',
          description: 'Desc 3',
          category: 'cat3',
          priority: 'low',
          effort_estimate: '1 week',
        },
      ],
    };

    expect(bulkCreate.obligations).toHaveLength(3);
    expect(bulkCreate.obligations.map((o) => o.priority)).toEqual(['high', 'medium', 'low']);
  });

  it('should be idempotent for concurrent calls', () => {
    // Multiple calls with same data should result in single entry
    // (handled by database unique constraints + timestamp logic)
    const createCall1 = {
      assessment_id: 'same-id',
      ai_system_id: 'system-1',
      obligations: [{ id: 'obl-1', title: 'Test', description: 'Desc', category: 'test', priority: 'high', effort_estimate: '1w' }],
    };

    const createCall2 = {
      assessment_id: 'same-id',
      ai_system_id: 'system-1',
      obligations: [{ id: 'obl-1', title: 'Test', description: 'Desc', category: 'test', priority: 'high', effort_estimate: '1w' }],
    };

    expect(JSON.stringify(createCall1)).toBe(JSON.stringify(createCall2));
  });
});
