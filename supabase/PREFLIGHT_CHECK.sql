-- PREFLIGHT_CHECK.sql
-- Pre-Deployment Inventory & Go/No-Go Decision
-- Run BEFORE deploying schema.sql to detect conflicts and existing objects
-- Non-destructive: only reads, does not modify database

-- ============================================================================
-- 1. EXISTING TABLES (will be skipped by CREATE TABLE IF NOT EXISTS)
-- ============================================================================
\echo '=== EXISTING TABLES (CREATE TABLE IF NOT EXISTS will skip these) ==='
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- 2. EXISTING INDEXES (will be skipped by CREATE INDEX IF NOT EXISTS)
-- ============================================================================
\echo '=== EXISTING INDEXES (CREATE INDEX IF NOT EXISTS will skip these) ==='
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;

-- ============================================================================
-- 3. EXISTING FUNCTIONS (will be replaced by CREATE OR REPLACE FUNCTION)
-- ============================================================================
\echo '=== EXISTING FUNCTIONS (CREATE OR REPLACE FUNCTION will overwrite) ==='
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- 4. EXISTING TRIGGERS (will be dropped and recreated)
-- ============================================================================
\echo '=== EXISTING TRIGGERS (DROP TRIGGER IF EXISTS will remove, then recreate) ==='
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- ============================================================================
-- 5. EXISTING RLS POLICIES (CRITICAL — CREATE POLICY will fail if exists)
-- ============================================================================
\echo '=== EXISTING RLS POLICIES (CREATE POLICY will fail if these exist) ==='
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 6. SUMMARY COUNTS
-- ============================================================================
\echo ''
\echo '=== PREFLIGHT SUMMARY ==='

WITH obj_counts AS (
  SELECT
    'TABLES' as type,
    COUNT(*) as count
  FROM information_schema.tables
  WHERE table_schema = 'public'

  UNION ALL

  SELECT
    'INDEXES' as type,
    COUNT(*) as count
  FROM pg_indexes
  WHERE schemaname = 'public'

  UNION ALL

  SELECT
    'FUNCTIONS' as type,
    COUNT(*) as count
  FROM information_schema.routines
  WHERE routine_schema = 'public'

  UNION ALL

  SELECT
    'TRIGGERS' as type,
    COUNT(*) as count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'

  UNION ALL

  SELECT
    'POLICIES' as type,
    COUNT(*) as count
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT type, count FROM obj_counts ORDER BY type;

-- ============================================================================
-- 7. GO/NO-GO DECISION
-- ============================================================================
\echo ''
\echo '=== GO/NO-GO DECISION ==='

WITH existing_policies AS (
  SELECT COUNT(*) as count FROM pg_policies WHERE schemaname = 'public'
)
SELECT
  CASE
    WHEN (SELECT count FROM existing_policies) > 0
    THEN 'NO-GO: Existing RLS policies will cause CREATE POLICY to fail. Run DROP POLICY IF EXISTS or deploy to clean database.'
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') = 0
    THEN 'GO: Database is clean. Safe to deploy schema.sql'
    ELSE 'GO: Existing objects will be skipped (CREATE IF NOT EXISTS) or replaced (CREATE OR REPLACE). Verify above list for conflicts.'
  END as status;

\echo ''
\echo 'Preflight check complete. Review GO/NO-GO decision above before proceeding to schema.sql deployment.'
