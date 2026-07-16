/**
 * Phase 2 Test Data Population Orchestration
 *
 * Automatically populates Supabase with test data when schema is detected.
 * Handles population, verification, and status reporting.
 *
 * DNA-GOV-216: Autonomous execution without Founder intervention
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface PopulationStatus {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  timestamp: string;
  organizationsLoaded: number;
  usersLoaded: number;
  systemsLoaded: number;
  errorMessage?: string;
  duration?: number;
}

/**
 * Load test data from local JSON file
 */
export async function loadTestDataFile(): Promise<any[]> {
  try {
    const filePath = path.join(
      process.cwd(),
      'test-data',
      'organizations.json'
    );
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(
      `Failed to load test data file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verify test data file integrity
 */
export async function verifyTestDataIntegrity(
  organizations: any[]
): Promise<boolean> {
  if (!Array.isArray(organizations) || organizations.length === 0) {
    return false;
  }

  // Check minimum required fields
  for (const org of organizations) {
    if (!org.id || !org.name || !org.industry) {
      return false;
    }
  }

  return true;
}

/**
 * Populate Supabase with test organizations and related data
 */
export async function populateTestData(
  projectUrl: string,
  serviceRoleKey: string,
  dryRun: boolean = false
): Promise<PopulationStatus> {
  const startTime = Date.now();
  let organizationsLoaded = 0;
  let usersLoaded = 0;
  let systemsLoaded = 0;

  try {
    // Load test data
    const organizations = await loadTestDataFile();

    // Verify integrity
    const isValid = await verifyTestDataIntegrity(organizations);
    if (!isValid) {
      return {
        status: 'failed',
        timestamp: new Date().toISOString(),
        organizationsLoaded: 0,
        usersLoaded: 0,
        systemsLoaded: 0,
        errorMessage: 'Test data file integrity check failed',
      };
    }

    if (dryRun) {
      console.log(
        '[PHASE-2-DATA] DRY RUN: Would populate',
        organizations.length,
        'organizations'
      );
      return {
        status: 'completed',
        timestamp: new Date().toISOString(),
        organizationsLoaded: organizations.length,
        usersLoaded: organizations.reduce(
          (sum, org) => sum + (org.members?.length || 0),
          0
        ),
        systemsLoaded: organizations.reduce(
          (sum, org) => sum + (org.systems?.length || 0),
          0
        ),
        duration: Date.now() - startTime,
      };
    }

    // Create Supabase client
    const client = createClient(projectUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Populate organizations
    console.log(
      '[PHASE-2-DATA] Starting population of',
      organizations.length,
      'organizations'
    );

    for (const org of organizations) {
      try {
        // Insert organization
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
            `[PHASE-2-DATA] Failed to insert organization ${org.name}:`,
            orgError?.message
          );
          continue;
        }

        organizationsLoaded++;

        // Insert members
        if (org.members && Array.isArray(org.members)) {
          const memberData = org.members.map((member: any) => ({
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

          const { error: memberError } = await client
            .from('workspace_members')
            .insert(memberData);

          if (!memberError) {
            usersLoaded += memberData.length;
          }
        }

        // Insert AI systems
        if (org.systems && Array.isArray(org.systems)) {
          const systemData = org.systems.map((system: any) => ({
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

          const { error: systemError } = await client
            .from('ai_systems')
            .insert(systemData);

          if (!systemError) {
            systemsLoaded += systemData.length;
          }
        }
      } catch (error) {
        console.error(
          `[PHASE-2-DATA] Error processing organization ${org.name}:`,
          error
        );
        continue;
      }
    }

    const duration = Date.now() - startTime;
    console.log('[PHASE-2-DATA] Population complete:', {
      organizationsLoaded,
      usersLoaded,
      systemsLoaded,
      duration,
    });

    return {
      status: 'completed',
      timestamp: new Date().toISOString(),
      organizationsLoaded,
      usersLoaded,
      systemsLoaded,
      duration,
    };
  } catch (error) {
    return {
      status: 'failed',
      timestamp: new Date().toISOString(),
      organizationsLoaded,
      usersLoaded,
      systemsLoaded,
      errorMessage: `Population failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Get current population status
 */
export async function getPopulationStatus(
  projectUrl: string,
  serviceRoleKey: string
): Promise<PopulationStatus> {
  try {
    const client = createClient(projectUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Count existing test organizations
    const { count: orgCount } = await client
      .from('companies')
      .select('*', { count: 'exact' })
      .eq('metadata->testDataMarker', 'true');

    if ((orgCount || 0) > 0) {
      return {
        status: 'completed',
        timestamp: new Date().toISOString(),
        organizationsLoaded: orgCount || 0,
        usersLoaded: 0, // Would need separate query
        systemsLoaded: 0, // Would need separate query
      };
    }

    return {
      status: 'pending',
      timestamp: new Date().toISOString(),
      organizationsLoaded: 0,
      usersLoaded: 0,
      systemsLoaded: 0,
    };
  } catch (error) {
    return {
      status: 'failed',
      timestamp: new Date().toISOString(),
      organizationsLoaded: 0,
      usersLoaded: 0,
      systemsLoaded: 0,
      errorMessage: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Orchestrated Phase 2 data population
 * Checks if needed, populates if not already done, verifies completion
 */
export async function orchestrateDataPopulation(
  projectUrl: string,
  serviceRoleKey: string
): Promise<{ success: boolean; message: string; status: PopulationStatus }> {
  try {
    // Check current status
    const currentStatus = await getPopulationStatus(projectUrl, serviceRoleKey);

    if (currentStatus.status === 'completed') {
      return {
        success: true,
        message: 'Test data already populated',
        status: currentStatus,
      };
    }

    // Populate test data
    console.log('[PHASE-2-ORCHESTRATION] Beginning test data population');
    const populationStatus = await populateTestData(
      projectUrl,
      serviceRoleKey,
      false
    );

    if (populationStatus.status === 'completed') {
      return {
        success: true,
        message: `Test data populated successfully: ${populationStatus.organizationsLoaded} orgs, ${populationStatus.usersLoaded} users, ${populationStatus.systemsLoaded} systems`,
        status: populationStatus,
      };
    }

    return {
      success: false,
      message:
        populationStatus.errorMessage || 'Population failed with unknown error',
      status: populationStatus,
    };
  } catch (error) {
    return {
      success: false,
      message: `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: {
        status: 'failed',
        timestamp: new Date().toISOString(),
        organizationsLoaded: 0,
        usersLoaded: 0,
        systemsLoaded: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
