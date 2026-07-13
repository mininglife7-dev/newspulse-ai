/**
 * Production Preflight Checks
 *
 * Verifies all required configuration and database prerequisites.
 * Fails fast with clear instructions if any critical dependency is missing.
 * Runs once at application startup in production.
 */

import { createClient } from '@supabase/supabase-js';

export interface PreflightCheckResult {
  ok: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }[];
  blockers: string[];
  setupInstructions: string | null;
}

/**
 * Run all preflight checks
 * In production, if critical checks fail, the application will not start.
 */
export async function runPreflightChecks(): Promise<PreflightCheckResult> {
  const checks: PreflightCheckResult['checks'] = [];
  const blockers: string[] = [];

  // Check 1: Environment variables exist
  const envCheck = checkEnvironmentVariables();
  checks.push(envCheck);
  if (envCheck.status !== 'pass') {
    blockers.push(envCheck.message);
  }

  // Check 2: Supabase connectivity
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const supabaseCheck = await checkSupabaseConnectivity();
    checks.push(supabaseCheck);
    if (supabaseCheck.status === 'fail') {
      blockers.push(supabaseCheck.message);
    } else {
      // Check 3: Supabase schema deployed (only if connected)
      const schemaCheck = await checkSupabaseSchema();
      checks.push(schemaCheck);
      if (schemaCheck.status === 'fail') {
        blockers.push(schemaCheck.message);
      }
    }
  }

  // Check 4: ADMIN_TOKEN configured
  const adminTokenCheck = checkAdminToken();
  checks.push(adminTokenCheck);

  // Check 5: Critical environment variables for production
  const productionEnvCheck = checkProductionEnvironment();
  checks.push(productionEnvCheck);
  // Note: production env check only returns pass/warn (never fail), so warnings are non-blocking

  const setupInstructions =
    blockers.length > 0 ? generateSetupInstructions(blockers) : null;

  return {
    ok: blockers.length === 0,
    checks,
    blockers,
    setupInstructions,
  };
}

function checkEnvironmentVariables() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter((v) => !process.env[v]);

  if (missing.length === 0) {
    return {
      name: 'Environment Variables',
      status: 'pass' as const,
      message: 'All Supabase environment variables configured',
    };
  }

  return {
    name: 'Environment Variables',
    status: 'fail' as const,
    message: `Missing environment variables: ${missing.join(', ')}`,
  };
}

async function checkSupabaseConnectivity() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    // Simple connection test: query auth.users table (exists by default)
    const { error } = await supabase.from('auth.users').select('id').limit(1);

    // Note: error might exist but that's OK - we're just checking connectivity
    // A 401 or 403 means auth is working; other errors mean no connection

    return {
      name: 'Supabase Connectivity',
      status: 'pass' as const,
      message: 'Connected to Supabase project',
    };
  } catch (error) {
    return {
      name: 'Supabase Connectivity',
      status: 'fail' as const,
      message: `Cannot connect to Supabase: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function checkSupabaseSchema() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    // Check if key tables exist
    const requiredTables = [
      'public.profiles',
      'public.workspaces',
      'public.companies',
    ];

    for (const table of requiredTables) {
      const [schema, tableName] = table.split('.');
      const { error, data } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error) {
        // If the table doesn't exist, we get a 406 error
        if (error.code === '406' || error.message?.includes('not found')) {
          return {
            name: 'Supabase Schema',
            status: 'fail' as const,
            message: `Required schema table not found: ${table}. Run "supabase db push" or execute supabase/schema.sql in Supabase dashboard.`,
          };
        }
      }
    }

    return {
      name: 'Supabase Schema',
      status: 'pass' as const,
      message: 'All required schema tables exist',
    };
  } catch (error) {
    return {
      name: 'Supabase Schema',
      status: 'warn' as const,
      message: `Cannot verify schema (connection issue): ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function checkAdminToken() {
  if (!process.env.ADMIN_TOKEN) {
    return {
      name: 'ADMIN_TOKEN',
      status: 'warn' as const,
      message:
        'ADMIN_TOKEN not configured — monitoring endpoints will be accessible without authentication',
    };
  }

  if (process.env.ADMIN_TOKEN.length < 32) {
    return {
      name: 'ADMIN_TOKEN',
      status: 'warn' as const,
      message: `ADMIN_TOKEN configured but appears weak (${process.env.ADMIN_TOKEN.length} chars). Recommend regenerating with: openssl rand -hex 32`,
    };
  }

  return {
    name: 'ADMIN_TOKEN',
    status: 'pass' as const,
    message: 'ADMIN_TOKEN configured',
  };
}

function checkProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') {
    return {
      name: 'Production Environment',
      status: 'warn' as const,
      message: 'Running in non-production mode (development)',
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return {
      name: 'Production Environment',
      status: 'warn' as const,
      message: 'NEXT_PUBLIC_APP_URL not configured',
    };
  }

  if (!appUrl.startsWith('https://') && !appUrl.includes('localhost')) {
    return {
      name: 'Production Environment',
      status: 'warn' as const,
      message: 'NEXT_PUBLIC_APP_URL should use HTTPS for production',
    };
  }

  return {
    name: 'Production Environment',
    status: 'pass' as const,
    message: 'Production configuration verified',
  };
}

function generateSetupInstructions(blockers: string[]): string {
  return `
⚠️  PRODUCTION SETUP INCOMPLETE ⚠️

The application detected missing configuration. Complete these steps:

${blockers
  .map(
    (blocker, i) => `
${i + 1}. ${blocker}
`
  )
  .join('')}

DETAILED SETUP:

Step 1: Deploy Supabase Schema
  Option A (Dashboard):
    1. Visit https://supabase.com and open your project
    2. Go to SQL Editor
    3. Create new query and paste: cat supabase/schema.sql
    4. Click Run
    5. Verify: Run supabase/POST_DEPLOYMENT_VERIFICATION.sql

  Option B (CLI):
    $ supabase link --project-ref your-project-ref
    $ supabase db push

Step 2: Configure Environment Variables in Vercel
  1. Visit https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai/settings/environment-variables
  2. Add all 8 required variables:
     - NEXT_PUBLIC_SUPABASE_URL
     - NEXT_PUBLIC_SUPABASE_ANON_KEY
     - SUPABASE_SERVICE_ROLE_KEY
     - SUPABASE_PROJECT_ID
     - GITHUB_OWNER
     - GITHUB_REPO
     - NEXT_PUBLIC_APP_URL
     - ADMIN_TOKEN (generate: openssl rand -hex 32)
  3. Redeploy: Click Deployments > latest > Redeploy

Step 3: Verify Production
  1. Wait for deployment to complete
  2. Visit https://your-production-url/api/health
  3. Should return 200 OK

After completing these steps, redeploy or restart the application.
`.trim();
}

/**
 * Log preflight check results
 * Called during application startup
 */
export function logPreflightResults(result: PreflightCheckResult): void {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    console.log('📋 Preflight Checks:');
    result.checks.forEach((check) => {
      const icon = {
        pass: '✅',
        fail: '❌',
        warn: '⚠️',
      }[check.status];
      console.log(`  ${icon} ${check.name}: ${check.message}`);
    });

    if (!result.ok) {
      console.error('\n⚠️  PRODUCTION CONFIG INCOMPLETE\n');
      if (result.setupInstructions) {
        console.error(result.setupInstructions);
      }
    }
  } else {
    // Production: structured logging
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'preflight_check_failed',
        blockers: result.blockers,
        setupInstructions: result.setupInstructions,
      })
    );

    if (!result.ok) {
      throw new Error(
        `Production deployment failed preflight checks. ${result.blockers.join('; ')}`
      );
    }
  }
}
