#!/usr/bin/env node

/**
 * Phase 2 Test Data Population Script
 * Runs standalone to populate Supabase with test data
 * Used by GitHub Actions when schema deployment is detected
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function populateTestData() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectUrl || !serviceRoleKey) {
    console.log(
      '⚠️  SUPABASE credentials not configured. Skipping population.'
    );
    return false;
  }

  try {
    // Load test data
    const testDataPath = path.join(
      process.cwd(),
      'test-data',
      'organizations.json'
    );
    if (!fs.existsSync(testDataPath)) {
      console.log('⚠️  Test data file not found:', testDataPath);
      return false;
    }

    const testDataRaw = fs.readFileSync(testDataPath, 'utf-8');
    const organizations = JSON.parse(testDataRaw);

    if (!Array.isArray(organizations) || organizations.length === 0) {
      console.log('⚠️  Test data is empty');
      return false;
    }

    const client = createClient(projectUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if test data already populated
    const { count: existingCount } = await client
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if ((existingCount || 0) > 0) {
      console.log(
        `ℹ️  Test data already exists (${existingCount} companies). Skipping population.`
      );
      return true;
    }

    console.log(
      `[PHASE-2-DATA] Populating ${organizations.length} organizations...`
    );
    let populatedCount = 0;

    for (const org of organizations) {
      try {
        const { data: orgData, error: orgError } = await client
          .from('companies')
          .insert({
            name: org.name,
            industry: org.industry,
            country: org.country || 'DE',
            employees: org.employees || 0,
            metadata: {
              testDataMarker: true,
              generatedAt: new Date().toISOString(),
              sourceId: org.id,
            },
          })
          .select('id')
          .single();

        if (orgError || !orgData) {
          console.error(
            `[PHASE-2-DATA] Failed to insert ${org.name}:`,
            orgError?.message
          );
          continue;
        }

        populatedCount++;

        // Insert members if available
        if (
          org.members &&
          Array.isArray(org.members) &&
          org.members.length > 0
        ) {
          const memberData = org.members.map((member) => ({
            user_id:
              member.id ||
              `test-user-${Math.random().toString(36).substr(2, 9)}`,
            company_id: orgData.id,
            role: member.role || 'member',
            metadata: {
              testDataMarker: true,
              sourceId: member.id,
            },
          }));

          await client.from('workspace_members').insert(memberData);
        }

        // Insert AI systems if available
        if (
          org.systems &&
          Array.isArray(org.systems) &&
          org.systems.length > 0
        ) {
          const systemData = org.systems.map((system) => ({
            company_id: orgData.id,
            name: system.name,
            description: system.description,
            category: system.category,
            risk_level: system.riskLevel || 'medium',
            metadata: {
              testDataMarker: true,
              sourceId: system.id,
            },
          }));

          await client.from('ai_systems').insert(systemData);
        }
      } catch (error) {
        console.error(
          `[PHASE-2-DATA] Error processing ${org.name}:`,
          error.message
        );
        continue;
      }
    }

    console.log(
      `[PHASE-2-DATA] Population complete: ${populatedCount}/${organizations.length} organizations`
    );
    return populatedCount > 0;
  } catch (error) {
    console.error('❌ Population failed:', error.message);
    return false;
  }
}

populateTestData().then((success) => {
  process.exit(success ? 0 : 1);
});
