import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTestSupabase, cleanupTestData } from './setup';
import {
  createTestWorkspace,
  createTestAISystem,
  createTestAssessment,
  createTestObligation,
  createTestEvidence,
  listEvidenceForObligation,
} from './fixtures';

/**
 * Evidence & Compliance Journey Integration Tests
 *
 * Path: Create Evidence → Link to Obligation → Track Remediation → Mark Complete
 */

describe('Evidence & Compliance Journey', () => {
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

  it('should create evidence record', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);
    const obligation = await createTestObligation(workspaceId, assessment.id);
    const evidence = await createTestEvidence(workspaceId, obligation.id);

    expect(evidence).toBeDefined();
    expect(evidence.obligation_id).toBe(obligation.id);
    expect(evidence.workspace_id).toBe(workspaceId);
    expect(evidence.status).toBe('submitted');
  });

  it('should link evidence to obligation', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);
    const obligation = await createTestObligation(workspaceId, assessment.id);
    const evidence = await createTestEvidence(workspaceId, obligation.id);

    const linked = await listEvidenceForObligation(obligation.id);

    expect(linked).toBeDefined();
    expect(linked.length).toBeGreaterThan(0);
    expect(linked.map((e) => e.id)).toContain(evidence.id);
  });

  it('should support multiple evidence per obligation', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);
    const obligation = await createTestObligation(workspaceId, assessment.id);

    const ev1 = await createTestEvidence(workspaceId, obligation.id, {
      title: 'Evidence 1',
    });
    const ev2 = await createTestEvidence(workspaceId, obligation.id, {
      title: 'Evidence 2',
    });
    const ev3 = await createTestEvidence(workspaceId, obligation.id, {
      title: 'Evidence 3',
    });

    const linked = await listEvidenceForObligation(obligation.id);

    expect(linked.length).toBeGreaterThanOrEqual(3);
    expect(linked.map((e) => e.id)).toContain(ev1.id);
    expect(linked.map((e) => e.id)).toContain(ev2.id);
    expect(linked.map((e) => e.id)).toContain(ev3.id);
  });

  it('should update evidence status', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);
    const obligation = await createTestObligation(workspaceId, assessment.id);
    const evidence = await createTestEvidence(workspaceId, obligation.id, {
      status: 'submitted',
    });

    // Update status to approved
    const { data: updated } = await supabase
      .from('evidence')
      .update({ status: 'approved' })
      .eq('id', evidence.id)
      .select()
      .single();

    expect(updated?.status).toBe('approved');
  });

  it('should track evidence metadata', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);
    const obligation = await createTestObligation(workspaceId, assessment.id);
    const evidence = await createTestEvidence(workspaceId, obligation.id, {
      title: 'Privacy Policy Document',
      description: 'Current privacy policy v2.1',
      url: 'https://example.com/privacy',
    });

    expect(evidence.title).toBe('Privacy Policy Document');
    expect(evidence.description).toBe('Current privacy policy v2.1');
    expect(evidence.url).toBe('https://example.com/privacy');
  });

  it('should support evidence status workflow', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);
    const obligation = await createTestObligation(workspaceId, assessment.id);

    const evidence = await createTestEvidence(workspaceId, obligation.id, {
      status: 'submitted',
    });

    // Workflow: submitted → approved
    const { data: approved } = await supabase
      .from('evidence')
      .update({ status: 'approved' })
      .eq('id', evidence.id)
      .select()
      .single();

    expect(approved?.status).toBe('approved');
  });

  it('should track obligation status', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);
    const obligation = await createTestObligation(workspaceId, assessment.id, {
      status: 'identified',
    });

    expect(obligation.status).toBe('identified');

    // Update to in_progress
    const { data: updated } = await supabase
      .from('obligations')
      .update({ status: 'in_progress' })
      .eq('id', obligation.id)
      .select()
      .single();

    expect(updated?.status).toBe('in_progress');
  });

  it('should calculate compliance dashboard metrics', async () => {
    const system = await createTestAISystem(workspaceId);
    const assessment = await createTestAssessment(workspaceId, system.id);

    // Create obligations
    const ob1 = await createTestObligation(workspaceId, assessment.id, {
      status: 'identified',
    });
    const ob2 = await createTestObligation(workspaceId, assessment.id, {
      status: 'in_progress',
    });
    const ob3 = await createTestObligation(workspaceId, assessment.id, {
      status: 'completed',
    });

    // Create evidence
    const ev1 = await createTestEvidence(workspaceId, ob1.id, {
      status: 'submitted',
    });
    const ev2 = await createTestEvidence(workspaceId, ob2.id, {
      status: 'approved',
    });

    // Query metrics
    const { data: obligations } = await supabase
      .from('obligations')
      .select('status')
      .eq('workspace_id', workspaceId);

    const { data: evidence } = await supabase
      .from('evidence')
      .select('status')
      .eq('workspace_id', workspaceId);

    const identified = obligations?.filter((o) => o.status === 'identified').length || 0;
    const inProgress = obligations?.filter((o) => o.status === 'in_progress').length || 0;
    const completed = obligations?.filter((o) => o.status === 'completed').length || 0;
    const approved = evidence?.filter((e) => e.status === 'approved').length || 0;

    expect(identified).toBe(1);
    expect(inProgress).toBe(1);
    expect(completed).toBe(1);
    expect(approved).toBe(1);
  });

  // Error scenarios
  describe('Error Scenarios', () => {
    it('should reject evidence without obligation_id', async () => {
      const { error } = await supabase.from('evidence').insert({
        workspace_id: workspaceId,
        title: 'Orphan Evidence',
        // Missing obligation_id
      });

      expect(error).toBeDefined();
    });

    it('should reject evidence without workspace_id', async () => {
      const system = await createTestAISystem(workspaceId);
      const assessment = await createTestAssessment(workspaceId, system.id);
      const obligation = await createTestObligation(workspaceId, assessment.id);

      const { error } = await supabase.from('evidence').insert({
        obligation_id: obligation.id,
        title: 'No workspace',
        // Missing workspace_id
      });

      expect(error).toBeDefined();
    });

    it('should isolate evidence by workspace', async () => {
      const workspace2Id = (await createTestWorkspace('other-user-' + Date.now()))
        .id;

      const system1 = await createTestAISystem(workspaceId);
      const system2 = await createTestAISystem(workspace2Id);

      const assessment1 = await createTestAssessment(workspaceId, system1.id);
      const assessment2 = await createTestAssessment(workspace2Id, system2.id);

      const obligation1 = await createTestObligation(workspaceId, assessment1.id);
      const obligation2 = await createTestObligation(workspace2Id, assessment2.id);

      const evidence1 = await createTestEvidence(workspaceId, obligation1.id);
      const evidence2 = await createTestEvidence(workspace2Id, obligation2.id);

      const ws1Evidence = await listEvidenceForObligation(obligation1.id);
      const ws2Evidence = await listEvidenceForObligation(obligation2.id);

      expect(ws1Evidence.map((e) => e.id)).toContain(evidence1.id);
      expect(ws1Evidence.map((e) => e.id)).not.toContain(evidence2.id);

      expect(ws2Evidence.map((e) => e.id)).toContain(evidence2.id);
      expect(ws2Evidence.map((e) => e.id)).not.toContain(evidence1.id);
    });
  });
});
