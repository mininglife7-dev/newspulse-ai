#!/usr/bin/env node
/**
 * EURO AI Test Lab — Test Data Population
 *
 * Loads 50 fictional German SME organizations into Supabase database
 * for comprehensive Phase 2-5 testing.
 *
 * Prerequisites:
 * - Supabase schema deployed (database ready)
 * - .env.local with SUPABASE_SERVICE_ROLE_KEY configured
 * - test-data/organizations.json generated
 *
 * Usage: node scripts/populate-test-data.mjs --env production
 *
 * Options:
 *   --env <environment>  Target environment (development, preview, production)
 *   --dry-run           Show what would be populated without committing
 *   --verbose           Detailed logging
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const ENV = process.argv.find((arg) => arg.startsWith('--env='))?.split('=')[1] || 'development';

if (VERBOSE) {
  console.log(`📋 Configuration: DRY_RUN=${DRY_RUN}, ENV=${ENV}, VERBOSE=${VERBOSE}`);
}

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not configured in .env.local');
  console.error('   Add to .env.local:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

console.log(`\n🗄️  Supabase Connection: ${supabaseUrl}`);

// Load test data
const dataPath = join(__dirname, '../test-data/organizations.json');
let testData;

try {
  testData = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`\n✓ Test data loaded: ${testData.organizations.length} organizations`);
} catch (err) {
  console.error(`❌ Failed to load test data from ${dataPath}`);
  console.error(`   Error: ${err.message}`);
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Main population function
async function populateTestData() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log('EURO AI TEST LAB — DATA POPULATION');
  console.log(`${'═'.repeat(80)}`);
  console.log(`\nTarget Environment: ${ENV}`);
  console.log(`Dry Run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log(`Organizations to load: ${testData.organizations.length}`);

  try {
    // 1. Verify Supabase connection
    console.log(`\n${'─'.repeat(80)}`);
    console.log('Step 1: Verifying Supabase Connection');
    console.log(`${'─'.repeat(80)}`);

    const { data: healthCheck, error: healthError } = await supabase.from('customers').select('id', {
      count: 'exact',
      head: true,
    });

    if (healthError && healthError.code !== 'PGRST116') {
      // 404 is expected if table exists but is empty
      console.error(`❌ Database connection failed: ${healthError.message}`);
      process.exit(1);
    }

    console.log(`✓ Database connection verified`);

    // 2. Check existing data
    console.log(`\n${'─'.repeat(80)}`);
    console.log('Step 2: Checking for Existing Test Data');
    console.log(`${'─'.repeat(80)}`);

    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('id')
      .eq('is_test_data', true);

    if (existingError) {
      console.warn(`⚠️  Warning: Could not check for existing test data: ${existingError.message}`);
    } else {
      console.log(`Found ${existing?.length || 0} existing test organization(s)`);

      if ((existing?.length || 0) > 0 && !DRY_RUN) {
        console.warn(`\n⚠️  Warning: Test data already exists. Use --dry-run to preview.`);
        return;
      }
    }

    // 3. Population summary
    console.log(`\n${'─'.repeat(80)}`);
    console.log('Population Plan');
    console.log(`${'─'.repeat(80)}`);

    const stats = {
      organizations: testData.organizations.length,
      totalEmployees: testData.organizations.reduce((sum, org) => sum + org.employeeCount, 0),
      totalUsers: testData.organizations.reduce((sum, org) => sum + org.users.length, 0),
      totalAiSystems: testData.organizations.reduce((sum, org) => sum + org.aiSystems.length, 0),
      highRiskSystems: testData.organizations.reduce(
        (sum, org) => sum + org.aiSystems.filter((sys) => sys.riskLevel === 'High').length,
        0,
      ),
    };

    console.log(`\nOrganizations:   ${stats.organizations}`);
    console.log(`Employees:       ${stats.totalEmployees} (simulated)`);
    console.log(`User Accounts:   ${stats.totalUsers}`);
    console.log(`AI Systems:      ${stats.totalAiSystems}`);
    console.log(`High-Risk:       ${stats.highRiskSystems}`);

    if (DRY_RUN) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log('DRY RUN: Population not executed');
      console.log(`${'─'.repeat(80)}`);
      console.log(`\nTo execute, run without --dry-run flag:`);
      console.log(`  node scripts/populate-test-data.mjs --env=${ENV}`);
      return;
    }

    // 4. Perform population
    console.log(`\n${'─'.repeat(80)}`);
    console.log('Populating Test Data...');
    console.log(`${'─'.repeat(80)}`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < testData.organizations.length; i++) {
      const org = testData.organizations[i];

      if (VERBOSE) {
        process.stdout.write(`\r  [${i + 1}/${testData.organizations.length}] ${org.name}...`);
      }

      try {
        // Insert organization as customer
        const { error: insertError } = await supabase.from('customers').insert({
          id: org.id,
          workspace_id: org.id, // Assuming workspace_id = org.id for test data
          name: org.name,
          industry: org.industry,
          country: org.country,
          employees: org.employeeCount,
          founded_year: org.founded,
          annual_revenue: org.annualRevenue,
          is_test_data: true,
          created_at: new Date().toISOString(),
          metadata: {
            source: 'phase-1-test-lab',
            organization_id: org.id,
            departments: org.departments.length,
            ai_systems: org.aiSystems.length,
            regulatory_scope: org.complianceProfile,
          },
        });

        if (insertError) {
          console.error(`\n❌ Failed to insert ${org.name}: ${insertError.message}`);
          failureCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`\n❌ Exception inserting ${org.name}: ${err.message}`);
        failureCount++;
      }
    }

    // 5. Results
    console.log(`\n\n${'─'.repeat(80)}`);
    console.log('Population Results');
    console.log(`${'─'.repeat(80)}`);

    console.log(`\nSuccessfully loaded: ${successCount} organizations`);
    if (failureCount > 0) {
      console.log(`Failed to load: ${failureCount} organizations`);
    }

    console.log(`\n${'═'.repeat(80)}`);
    if (failureCount === 0) {
      console.log(`✅ Phase 1 Test Data Successfully Populated`);
      console.log(`\nPhase 2 can now proceed with:`);
      console.log(`  node scripts/phase-2-customer-journeys.mjs`);
    } else {
      console.log(`⚠️  Partial Population (${successCount}/${testData.organizations.length} succeeded)`);
    }
    console.log(`${'═'.repeat(80)}`);
  } catch (err) {
    console.error(`\n❌ Fatal error during population: ${err.message}`);
    process.exit(1);
  }
}

// Run population
populateTestData().catch((err) => {
  console.error(`\n❌ Unexpected error: ${err.message}`);
  process.exit(1);
});
