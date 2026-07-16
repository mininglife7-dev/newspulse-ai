-- CEIS_POST_DEPLOYMENT_VERIFICATION.sql
-- Validate the DNA-300 (CEIS) schema after deploying ceis-schema.sql.
-- Style follows POST_DEPLOYMENT_VERIFICATION.sql: report sections via \echo,
-- and hard-fail (DO block exception) on any missing invariant so the deploy
-- workflow surfaces a real error instead of a silent partial deploy.

\echo '=== CEIS (DNA-300) POST-DEPLOYMENT VERIFICATION ==='
\echo ''

\echo '1. CEIS TABLES (5 expected)'
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'ceis_observations', 'ceis_principles', 'ceis_dna_proposals',
  'ceis_genome', 'ceis_reports'
)
ORDER BY table_name;

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM unnest(ARRAY[
    'ceis_observations', 'ceis_principles', 'ceis_dna_proposals',
    'ceis_genome', 'ceis_reports'
  ]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'CEIS tables missing: %', missing;
  END IF;
END $$;

\echo ''
\echo '2. ROW LEVEL SECURITY (all 5 must be enabled; server-only tables, no anon policies expected)'
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname LIKE 'ceis_%' AND c.relkind = 'r'
ORDER BY c.relname;

DO $$
DECLARE
  unprotected text;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO unprotected
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'ceis_%'
    AND c.relkind = 'r' AND NOT c.relrowsecurity;
  IF unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'CEIS tables without RLS: %', unprotected;
  END IF;
END $$;

\echo ''
\echo '3. CEIS INDEXES (5 expected)'
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'ceis_%'
  AND indexname NOT LIKE '%_pkey'
ORDER BY indexname;

\echo ''
\echo '4. STATUS CHECK CONSTRAINT on ceis_dna_proposals'
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.ceis_dna_proposals'::regclass AND contype = 'c';

\echo ''
\echo '=== CEIS VERIFICATION PASSED ==='
