import { getTestSupabase, cleanupTestData } from './setup';

/**
 * Test fixtures and factory functions for integration tests
 */

export const TEST_USERS = {
  founder: {
    email: `founder-${Date.now()}@test.example.com`,
    password: 'Test123!@#',
  },
  admin: {
    email: `admin-${Date.now()}@test.example.com`,
    password: 'Test123!@#',
  },
  member: {
    email: `member-${Date.now()}@test.example.com`,
    password: 'Test123!@#',
  },
};

export const TEST_WORKSPACES = {
  default: {
    name: 'Test Workspace',
    description: 'Integration test workspace',
  },
};

/**
 * Create a test workspace
 */
export async function createTestWorkspace(
  userId: string,
  overrides?: Partial<typeof TEST_WORKSPACES.default>
) {
  const supabase = getTestSupabase();
  const workspaceData = {
    ...TEST_WORKSPACES.default,
    ...overrides,
    owner_id: userId,
  };

  const { data, error } = await supabase
    .from('workspaces')
    .insert(workspaceData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test AI system
 */
export async function createTestAISystem(
  workspaceId: string,
  overrides?: Partial<{
    name: string;
    vendor: string;
    system_type: string;
    purpose: string;
    description: string;
  }>
) {
  const supabase = getTestSupabase();
  const systemData = {
    name: `Test AI System ${Date.now()}`,
    vendor: 'Test Vendor',
    system_type: 'general-purpose',
    purpose: 'Testing',
    workspace_id: workspaceId,
    ...overrides,
  };

  const { data, error } = await supabase
    .from('ai_systems')
    .insert(systemData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test assessment
 */
export async function createTestAssessment(
  workspaceId: string,
  aiSystemId: string,
  overrides?: Partial<{
    risk_level: string;
    status: string;
    answers: Record<string, any>;
  }>
) {
  const supabase = getTestSupabase();
  const assessmentData = {
    ai_system_id: aiSystemId,
    workspace_id: workspaceId,
    risk_level: 'medium',
    status: 'draft',
    answers: {},
    ...overrides,
  };

  const { data, error } = await supabase
    .from('risk_assessments')
    .insert(assessmentData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test obligation
 */
export async function createTestObligation(
  workspaceId: string,
  assessmentId: string,
  overrides?: Partial<{
    title: string;
    status: string;
    priority: string;
    due_date: string;
  }>
) {
  const supabase = getTestSupabase();
  const obligationData = {
    workspace_id: workspaceId,
    assessment_id: assessmentId,
    title: `Test Obligation ${Date.now()}`,
    status: 'identified',
    priority: 'medium',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    ...overrides,
  };

  const { data, error } = await supabase
    .from('obligations')
    .insert(obligationData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create test evidence
 */
export async function createTestEvidence(
  workspaceId: string,
  obligationId: string,
  overrides?: Partial<{
    title: string;
    description: string;
    status: string;
    url: string;
  }>
) {
  const supabase = getTestSupabase();
  const evidenceData = {
    workspace_id: workspaceId,
    obligation_id: obligationId,
    title: `Test Evidence ${Date.now()}`,
    description: 'Test evidence description',
    status: 'submitted',
    url: 'https://example.com/evidence',
    ...overrides,
  };

  const { data, error } = await supabase
    .from('evidence')
    .insert(evidenceData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a workspace member
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' = 'member'
) {
  const supabase = getTestSupabase();
  const { data, error } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(workspaceId: string) {
  const supabase = getTestSupabase();
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * List assessments for workspace
 */
export async function listAssessments(workspaceId: string) {
  const supabase = getTestSupabase();
  const { data, error } = await supabase
    .from('risk_assessments')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data || [];
}

/**
 * List obligations for workspace
 */
export async function listObligations(workspaceId: string) {
  const supabase = getTestSupabase();
  const { data, error } = await supabase
    .from('obligations')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data || [];
}

/**
 * List evidence for obligation
 */
export async function listEvidenceForObligation(obligationId: string) {
  const supabase = getTestSupabase();
  const { data, error } = await supabase
    .from('evidence')
    .select('*')
    .eq('obligation_id', obligationId);

  if (error) throw error;
  return data || [];
}
