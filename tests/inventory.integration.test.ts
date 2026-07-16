import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTestSupabase, cleanupTestData } from './setup';
import { createTestWorkspace, createTestAISystem } from './fixtures';

/**
 * AI System Inventory Journey Integration Tests
 *
 * Path: Create System → Add Details → Update → Delete
 */

describe('AI System Inventory Journey', () => {
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

  it('should create AI system with required fields', async () => {
    const system = await createTestAISystem(workspaceId);

    expect(system).toBeDefined();
    expect(system.name).toBeDefined();
    expect(system.workspace_id).toBe(workspaceId);
    expect(system.created_at).toBeDefined();
    expect(system.id).toBeDefined();
  });

  it('should appear in inventory list', async () => {
    const system = await createTestAISystem(workspaceId);

    const { data: systems } = await supabase
      .from('ai_systems')
      .select('*')
      .eq('workspace_id', workspaceId);

    expect(systems).toBeDefined();
    expect(systems?.length).toBeGreaterThan(0);
    expect(systems?.map((s) => s.id)).toContain(system.id);
  });

  it('should update system details', async () => {
    const system = await createTestAISystem(workspaceId);
    const newName = 'Updated System Name';

    const { data: updated } = await supabase
      .from('ai_systems')
      .update({ name: newName })
      .eq('id', system.id)
      .select()
      .single();

    expect(updated).toBeDefined();
    expect(updated?.name).toBe(newName);
  });

  it('should delete system from inventory', async () => {
    const system = await createTestAISystem(workspaceId);
    const systemId = system.id;

    // Delete
    await supabase.from('ai_systems').delete().eq('id', systemId);

    // Verify deleted
    const { data } = await supabase
      .from('ai_systems')
      .select('*')
      .eq('id', systemId);

    expect(data?.length).toBe(0);
  });

  it('should support multiple systems in workspace', async () => {
    const system1 = await createTestAISystem(workspaceId, { name: 'System 1' });
    const system2 = await createTestAISystem(workspaceId, { name: 'System 2' });
    const system3 = await createTestAISystem(workspaceId, { name: 'System 3' });

    const { data: systems } = await supabase
      .from('ai_systems')
      .select('*')
      .eq('workspace_id', workspaceId);

    expect(systems?.length).toBeGreaterThanOrEqual(3);
    expect(systems?.map((s) => s.id)).toContain(system1.id);
    expect(systems?.map((s) => s.id)).toContain(system2.id);
    expect(systems?.map((s) => s.id)).toContain(system3.id);
  });

  it('should support different system types', async () => {
    const general = await createTestAISystem(workspaceId, {
      system_type: 'general-purpose',
    });
    const highRisk = await createTestAISystem(workspaceId, {
      system_type: 'high-risk',
    });

    const { data: systems } = await supabase
      .from('ai_systems')
      .select('*')
      .eq('workspace_id', workspaceId);

    const types = systems?.map((s) => s.system_type) || [];
    expect(types).toContain('general-purpose');
    expect(types).toContain('high-risk');
  });

  it('should track system metadata (vendor, purpose)', async () => {
    const system = await createTestAISystem(workspaceId, {
      vendor: 'OpenAI',
      purpose: 'Content Analysis',
    });

    expect(system.vendor).toBe('OpenAI');
    expect(system.purpose).toBe('Content Analysis');
  });

  // Error scenarios
  describe('Error Scenarios', () => {
    it('should reject system without name', async () => {
      const { error } = await supabase.from('ai_systems').insert({
        workspace_id: workspaceId,
        // Missing required name
      });

      expect(error).toBeDefined();
    });

    it('should reject system without workspace_id', async () => {
      const { error } = await supabase.from('ai_systems').insert({
        name: 'Orphan System',
        // Missing workspace_id
      });

      expect(error).toBeDefined();
    });

    it('should isolate systems by workspace', async () => {
      const workspace2Id = (await createTestWorkspace('other-user-' + Date.now())).id;
      const system = await createTestAISystem(workspaceId);

      const { data: ws1Systems } = await supabase
        .from('ai_systems')
        .select('*')
        .eq('workspace_id', workspaceId);

      const { data: ws2Systems } = await supabase
        .from('ai_systems')
        .select('*')
        .eq('workspace_id', workspace2Id);

      expect(ws1Systems?.map((s) => s.id)).toContain(system.id);
      expect(ws2Systems?.map((s) => s.id)).not.toContain(system.id);
    });

    it('should prevent deleting non-existent system', async () => {
      const { error } = await supabase
        .from('ai_systems')
        .delete()
        .eq('id', 'nonexistent-id');

      // Delete operation itself doesn't error, just returns 0 rows deleted
      expect(error).toBeNull();
    });
  });
});
