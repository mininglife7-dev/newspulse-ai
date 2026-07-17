import { beforeAll, afterEach, describe } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Global test setup for integration tests
 * Initializes test database, migrations, and fixtures
 */

let testSupabase: any;

export function getTestSupabase() {
  if (!testSupabase) {
    const url =
      process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.TEST_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase test credentials not configured');
    }

    testSupabase = createClient(url, key);
  }
  return testSupabase;
}

/**
 * Clean up test data after each test
 * Deletes in reverse dependency order to respect foreign keys
 */
export async function cleanupTestData() {
  const supabase = getTestSupabase();

  try {
    // Delete in reverse dependency order
    await Promise.all([
      supabase.from('remediation_plans').delete().neq('id', ''),
      supabase.from('evidence').delete().neq('id', ''),
      supabase.from('obligations').delete().neq('id', ''),
      supabase.from('risk_assessments').delete().neq('id', ''),
      supabase.from('ai_systems').delete().neq('id', ''),
      supabase.from('workspace_members').delete().neq('id', ''),
      supabase.from('workspaces').delete().neq('id', ''),
    ]);
  } catch (err) {
    // Log but don't fail test if cleanup has issues
    console.error('Cleanup error (non-fatal):', err);
  }
}

/**
 * Set up test environment
 */
beforeAll(async () => {
  // Verify test database connectivity
  const supabase = getTestSupabase();
  const { data, error } = await supabase
    .from('workspaces')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  if (error) {
    throw new Error(`Cannot connect to test database: ${error.message}`);
  }
});

/**
 * Clean up after each test
 */
afterEach(async () => {
  await cleanupTestData();
});
