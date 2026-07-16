#!/usr/bin/env node

/**
 * Phase 2 Readiness Verification Script
 * Used by GitHub Actions to check Supabase schema deployment
 *
 * Sets GITHUB_OUTPUT:
 * - SCHEMA_DEPLOYED=true|false
 * - CREDENTIALS_MISSING=true (if no credentials)
 * - VERIFICATION_ERROR=true (if query fails)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verifySchemaDeployment() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const githubOutput = process.env.GITHUB_OUTPUT;

  if (!projectUrl || !serviceRoleKey) {
    console.log(
      '⚠️  SUPABASE credentials not configured. Skipping verification.'
    );
    if (githubOutput) {
      fs.appendFileSync(githubOutput, 'CREDENTIALS_MISSING=true\n');
    }
    return;
  }

  try {
    const client = createClient(projectUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query the information_schema to count tables
    const { data, error } = await client.rpc('information_schema.tables', {
      table_schema: 'public',
      table_type: 'BASE TABLE',
    });

    // If RPC doesn't exist, try direct query through Supabase
    // For now, we'll use a simpler approach: check if we can query a known table
    // If tables exist, we'll be able to query; if not, we'll get an error

    const { data: testData, error: testError } = await client
      .from('information_schema.tables')
      .select('table_name', { count: 'exact' })
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (testError && testError.code === 'PGRST116') {
      // Table doesn't exist, schema not deployed
      console.log('⏳ Supabase schema NOT YET DEPLOYED');
      if (githubOutput) {
        fs.appendFileSync(githubOutput, 'SCHEMA_DEPLOYED=false\n');
      }
      return;
    }

    if (testError) {
      throw testError;
    }

    // Try a simpler approach: attempt to query the companies table
    // If it exists, schema is deployed
    const { data: companies, error: companiesError } = await client
      .from('companies')
      .select('id', { count: 'exact' });

    if (companiesError) {
      // Check if it's a missing table error (42P01 is "undefined table")
      if (
        companiesError.code === '42P01' ||
        companiesError.code === 'PGRST116'
      ) {
        console.log(
          '⏳ Supabase schema NOT YET DEPLOYED (companies table not found)'
        );
        if (githubOutput) {
          fs.appendFileSync(githubOutput, 'SCHEMA_DEPLOYED=false\n');
        }
        return;
      }
      throw companiesError;
    }

    console.log('✅ Supabase schema DEPLOYED');
    if (githubOutput) {
      fs.appendFileSync(githubOutput, 'SCHEMA_DEPLOYED=true\n');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    if (githubOutput) {
      fs.appendFileSync(githubOutput, 'VERIFICATION_ERROR=true\n');
    }
  }
}

verifySchemaDeployment();
