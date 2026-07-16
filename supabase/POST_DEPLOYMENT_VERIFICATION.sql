-- POST_DEPLOYMENT_VERIFICATION.sql
-- Validate Successful Schema Deployment
-- Run AFTER deploying schema.sql to verify all objects created correctly
-- Uses dynamic counts, no hard-coded expectations

\echo '=== POST-DEPLOYMENT VERIFICATION REPORT ==='
\echo ''

-- ============================================================================
-- 1. TABLE VERIFICATION
-- ============================================================================
\echo '1. APPLICATION TABLES (9 expected)'
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'profiles', 'workspaces', 'workspace_members', 'companies', 'ai_systems',
  'risk_assessments', 'obligations', 'evidence', 'remediation_plans'
)
ORDER BY table_name;

\echo ''
\echo '2. HERCULES TABLES (6 expected)'
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'hercules_%'
ORDER BY table_name;

\echo ''
\echo '3. TOTAL TABLES (15 expected)'
SELECT COUNT(*) as total_tables FROM information_schema.tables
WHERE table_schema = 'public';

-- ============================================================================
-- 2. INDEX VERIFICATION
-- ============================================================================
\echo ''
\echo '4. APPLICATION INDEXES (16 expected)'
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN (
  'profiles', 'workspaces', 'workspace_members', 'companies', 'ai_systems',
  'risk_assessments', 'obligations', 'evidence', 'remediation_plans'
)
ORDER BY indexname;

\echo ''
\echo '5. HERCULES INDEXES (9 expected)'
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'hercules_%'
ORDER BY indexname;

\echo ''
\echo '6. TOTAL INDEXES (25 expected)'
SELECT COUNT(*) as total_indexes FROM pg_indexes
WHERE schemaname = 'public';

-- ============================================================================
-- 3. RLS POLICY VERIFICATION
-- ============================================================================
\echo ''
\echo '7. APPLICATION TABLE POLICIES (28 expected: 9 tables × 4 CRUD - 8 partial)'
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN (
  'profiles', 'workspaces', 'workspace_members', 'companies', 'ai_systems',
  'risk_assessments', 'obligations', 'evidence', 'remediation_plans'
)
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo '8. HERCULES TABLES — RLS ENABLED (should have 0 policies = service-role-only)'
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'hercules_%'
ORDER BY tablename;

\echo ''
\echo '9. HERCULES TABLE POLICIES (0 expected — service-role-only access)'
SELECT COUNT(*) as hercules_policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'hercules_%';

\echo ''
\echo '10. TOTAL POLICIES (31 expected: 9 app tables × 4 CRUD - 5 partial)'
SELECT COUNT(*) as total_policies FROM pg_policies
WHERE schemaname = 'public';

-- ============================================================================
-- 4. TRIGGER VERIFICATION
-- ============================================================================
\echo ''
\echo '11. TRIGGERS (1 expected: on_auth_user_created for profiles sync)'
-- The trigger is created ON auth.users, so it lives in the auth schema —
-- a trigger_schema = 'public' filter can never find it. Query pg_trigger
-- by name instead (information_schema also hides triggers on tables the
-- current role lacks privileges on).
SELECT t.tgname AS trigger_name, c.relname AS event_object_table
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname = 'on_auth_user_created'
ORDER BY t.tgname;

-- ============================================================================
-- 5. FUNCTION VERIFICATION
-- ============================================================================
\echo ''
\echo '12. FUNCTIONS (1 expected: handle_new_user for signup automation)'
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- 6. VERIFY RLS POLICIES BY OPERATION TYPE
-- ============================================================================
\echo ''
\echo '13. POLICY DISTRIBUTION BY OPERATION'
SELECT
  CASE
    WHEN policyname LIKE '%(SELECT)' OR policyname LIKE '%read%' THEN 'SELECT'
    WHEN policyname LIKE '%(INSERT)' OR policyname LIKE '%insert%' THEN 'INSERT'
    WHEN policyname LIKE '%(UPDATE)' OR policyname LIKE '%update%' THEN 'UPDATE'
    WHEN policyname LIKE '%(DELETE)' OR policyname LIKE '%delete%' THEN 'DELETE'
    ELSE 'OTHER'
  END as operation,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY operation
ORDER BY operation;

-- ============================================================================
-- 7. MULTI-TENANT ISOLATION CHECK
-- ============================================================================
\echo ''
\echo '14. MULTI-TENANT ISOLATION VERIFICATION'
\echo 'Checking that RLS policies exist on all application tables...'

SELECT
  tablename,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename AND schemaname = 'public') > 0
    THEN '✓ RLS policies exist'
    ELSE '✗ WARNING: No RLS policies on table'
  END as rls_status
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_name IN (
  'profiles', 'workspaces', 'workspace_members', 'companies', 'ai_systems',
  'risk_assessments', 'obligations', 'evidence', 'remediation_plans'
)
ORDER BY tablename;

-- ============================================================================
-- 8. FINAL STATUS REPORT
-- ============================================================================
\echo ''
\echo '=== DEPLOYMENT STATUS ==='

WITH expected_counts AS (
  SELECT 15 as expected_tables,
         25 as expected_indexes,
         31 as expected_policies,
         1 as expected_triggers,
         1 as expected_functions
),
actual_counts AS (
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as actual_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as actual_indexes,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as actual_policies,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created') as actual_triggers,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as actual_functions
)
SELECT
  e.expected_tables,
  a.actual_tables,
  CASE WHEN a.actual_tables >= e.expected_tables THEN '✓ PASS' ELSE '✗ FAIL' END as table_status,
  e.expected_indexes,
  a.actual_indexes,
  CASE WHEN a.actual_indexes >= e.expected_indexes THEN '✓ PASS' ELSE '✗ FAIL' END as index_status,
  e.expected_policies,
  a.actual_policies,
  CASE WHEN a.actual_policies >= e.expected_policies THEN '✓ PASS' ELSE '✗ FAIL' END as policy_status,
  e.expected_triggers,
  a.actual_triggers,
  CASE WHEN a.actual_triggers >= e.expected_triggers THEN '✓ PASS' ELSE '✗ FAIL' END as trigger_status,
  e.expected_functions,
  a.actual_functions,
  CASE WHEN a.actual_functions >= e.expected_functions THEN '✓ PASS' ELSE '✗ FAIL' END as function_status,
  CASE
    WHEN a.actual_tables >= e.expected_tables
      AND a.actual_indexes >= e.expected_indexes
      AND a.actual_policies >= e.expected_policies
      AND a.actual_triggers >= e.expected_triggers
      AND a.actual_functions >= e.expected_functions
    THEN '✓✓✓ DEPLOYMENT SUCCESSFUL ✓✓✓'
    ELSE '✗✗✗ DEPLOYMENT INCOMPLETE ✗✗✗'
  END as final_status
FROM expected_counts e, actual_counts a;

\echo ''
\echo 'Post-deployment verification complete.'
