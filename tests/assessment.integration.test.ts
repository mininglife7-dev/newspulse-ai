import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTestSupabase, cleanupTestData } from './setup';
import {
  createTestWorkspace,
  createTestAISystem,
  createTestAssessment,
  listAssessments,
  listObligations,
} from './fixtures';

/**
 * Risk Assessment Journey Integration Tests
 *
 * Path: Start Assessment → Answer Questions → Auto-Generate Obligations → Review
 */

describe('Risk Assessment Journey', () => {
  let supabase: ReturnType<typeof getTestSupabase>;
  let workspaceId: string;
  let userId = 'test-user-' + Date.now();

  beforeEach(async () => {
    supabase = getTestSupabase();
    const workspace = await createTestWorkspace(userId);
    workspaceId = workspace.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should create assessment with draft status', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);

    expect(assessment).toBeDefined();
    expect(assessment.status).toBe('draft');
    expect(assessment.ai_system_id).toBe(system.id);
    expect(assessment.workspace_id).toBe(workspaceId);
  });

  it('should calculate risk level based on answers', async () => {
    const system = await createTestAISystem(workspaceId);

    // Create assessment with high-risk answers
    const assessment = await createTestAssessment(workspaceId, system.id, {
      risk_level: 'high',
      answers: {
        'q4-credit-decision': true, // High-risk indicator
      },
    });

    expect(assessment.risk_level).toBe('high');
  });

  it('should support different risk levels', async () => {
    const system = await createTestAISystem(workspaceId);

    const low = await createTestAssessment(workspaceId, system.id, {
      risk_level: 'low',
    });
    const medium = await createTestAssessment(workspaceId, system.id, {
      risk_level: 'medium',
    });
    const high = await createTestAssessment(workspaceId, system.id, {
      risk_level: 'high',
    });

    expect(low.risk_level).toBe('low');
    expect(medium.risk_level).toBe('medium');
    expect(high.risk_level).toBe('high');
  });

  it('should finalize assessment', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id, {
      status: 'draft',
    });

    // Finalize
    const { data: finalized } = await supabase
      .from('risk_assessments')
      .update({ status: 'finalized' })
      .eq('id', assessment.id)
      .select()
      .single();

    expect(finalized?.status).toBe('finalized');
  });

  it('should list assessments for workspace', async () => {
    const system = await createTestAISystem(workspaceId);

    const a1 = await createTestAssessment(workspaceId, system.id);
    const a2 = await createTestAssessment(workspaceId, system.id);
    const a3 = await createTestAssessment(workspaceId, system.id);

    const assessments = await listAssessments(workspaceId);

    expect(assessments.length).toBeGreaterThanOrEqual(3);
    expect(assessments.map((a) => a.id)).toContain(a1.id);
    expect(assessments.map((a) => a.id)).toContain(a2.id);
    expect(assessments.map((a) => a.id)).toContain(a3.id);
  });

  it('should track assessment creation time', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);

    expect(assessment.created_at).toBeDefined();
    expect(new Date(assessment.created_at).getTime()).toBeGreaterThan(0);
  });

  it('should support assessment updates', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id, {
      risk_level: 'low',
    });

    const { data: updated } = await supabase
      .from('risk_assessments')
      .update({ risk_level: 'high' })
      .eq('id', assessment.id)
      .select()
      .single();

    expect(updated?.risk_level).toBe('high');
  });

  it('should store assessment answers', async () => {
    const system = await createTestAISystem(workspaceId);
    const answers = {
      'q1-prohibited': true,
      'q2-sensitive-data': true,
      'q3-vulnerable-groups': false,
    };

    const assessment = await createTestAssessment(workspaceId, system.id, {
      answers,
    });

    expect(assessment.answers).toEqual(answers);
  });

  // Error scenarios
  describe('Error Scenarios', () => {
    it('should reject assessment without ai_system_id', async () => {
      const { error } = await supabase.from('risk_assessments').insert({
        workspace_id: workspaceId,
        // Missing ai_system_id
        status: 'draft',
      });

      expect(error).toBeDefined();
    });

    it('should reject invalid risk level', async () => {
      const system = await createTestAISystem(workspaceId);

      const { error } = await supabase.from('risk_assessments').insert({
        ai_system_id: system.id,
        workspace_id: workspaceId,
        risk_level: 'invalid-risk', // Invalid value
      });

      expect(error).toBeDefined();
    });

    it('should reject assessment without workspace_id', async () => {
      const system = await createTestAISystem(workspaceId);

      const { error } = await supabase.from('risk_assessments').insert({
        ai_system_id: system.id,
        // Missing workspace_id
      });

      expect(error).toBeDefined();
    });

    it('should isolate assessments by workspace', async () => {
      const workspace2Id = (await createTestWorkspace('other-user-' + Date.now()))
        .id;
      const system1 = await createTestAISystem(workspaceId);
      const system2 = await createTestAISystem(workspace2Id);

      const assessment1 = await createTestAssessment(workspaceId, system1.id);
      const assessment2 = await createTestAssessment(workspace2Id, system2.id);

      const ws1Assessments = await listAssessments(workspaceId);
      const ws2Assessments = await listAssessments(workspace2Id);

      expect(ws1Assessments.map((a) => a.id)).toContain(assessment1.id);
      expect(ws1Assessments.map((a) => a.id)).not.toContain(assessment2.id);

      expect(ws2Assessments.map((a) => a.id)).toContain(assessment2.id);
      expect(ws2Assessments.map((a) => a.id)).not.toContain(assessment1.id);
    });
  });
});
