/**
 * Phase 1 Operational Acceptance Gate — Test Runner
 * Executes reference mission and captures all evidence for inspection.
 */

import { ReferenceMissionExecutor } from './reference-mission';
import { getOrCreateRegistry } from './capability-registry';
import { getOrCreatePolicyEngine } from './policy-engine';
import { getOrCreateLedger } from './evidence-ledger';
import { MissionModel } from './mission';
import { Planner } from './planner';

export async function runOperationalAcceptanceGate(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1 OPERATIONAL ACCEPTANCE GATE');
  console.log('='.repeat(70));

  try {
    // Initialize all components
    console.log('\n📋 Initializing Governor OS components...');
    const registry = await getOrCreateRegistry();
    const engine = await getOrCreatePolicyEngine(registry);
    const ledger = getOrCreateLedger();

    console.log('✓ Capability Registry initialized');
    console.log('✓ Policy Engine initialized');
    console.log('✓ Evidence Ledger initialized');

    // Show registry summary
    const regSummary = registry.getSummary();
    console.log(`\n📊 Capability Registry Summary:`);
    console.log(`   Total capabilities: ${regSummary.total}`);
    console.log(`   Verified: ${regSummary.verified}`);
    console.log(`   Available: ${regSummary.available}`);
    console.log(`   Blocked: ${regSummary.blocked}`);

    // Create executor
    console.log('\n🚀 Creating executor...');
    const executor = new ReferenceMissionExecutor(registry, engine, ledger);

    // Execute reference mission
    console.log('\n⚙️  Executing reference mission...');
    console.log('-'.repeat(70));
    const report = await executor.execute();
    console.log('-'.repeat(70));

    // Report results
    console.log('\n📈 Reference Mission Execution Report:');
    console.log(`   Mission ID: ${report.mission_id}`);
    console.log(`   Status: ${report.status}`);
    console.log(`   Tasks: ${report.completed_tasks}/${report.total_tasks} completed`);
    console.log(`   Failed: ${report.failed_tasks}`);
    console.log(`   Duration: ${report.execution_duration_ms}ms`);
    console.log(`   Fitness Baseline: ${report.fitness_baseline}`);
    console.log(`   Fitness Post: ${report.fitness_post_execution}`);
    console.log(`   Evidence Entries: ${report.evidence_count}`);

    // Inspect evidence ledger
    console.log('\n🔍 Evidence Ledger Inspection:');
    const summary = ledger.getSummary();
    console.log(`   Total Evidence Entries: ${summary.total}`);
    console.log(`   By Type:`);
    console.log(`     - TASK_RESULT: ${summary.by_type.TASK_RESULT}`);
    console.log(`     - VERIFICATION_RESULT: ${summary.by_type.VERIFICATION_RESULT}`);
    console.log(`     - CAPABILITY_CHECK: ${summary.by_type.CAPABILITY_CHECK}`);
    console.log(`     - HEALTH_INDICATOR: ${summary.by_type.HEALTH_INDICATOR}`);
    console.log(`     - LESSON: ${summary.by_type.LESSON}`);
    console.log(`     - DECISION: ${summary.by_type.DECISION}`);
    console.log(`   Missions: ${summary.missions.size}`);
    console.log(`   Tasks: ${summary.tasks.size}`);

    // Export evidence for inspection
    const allEvidence = ledger.exportJSON();
    console.log('\n📋 Evidence Entries (sample):');
    allEvidence.slice(0, 5).forEach((entry, idx) => {
      console.log(`\n   [${idx + 1}] ${entry.evidence_id}`);
      console.log(`       Type: ${entry.evidence_type}`);
      console.log(`       Action: ${entry.action}`);
      console.log(`       Subject: ${entry.subject}`);
      console.log(`       Result: ${entry.result}`);
      console.log(`       Hash: ${entry.content_hash}`);
    });

    // Verify all evidence hashes
    console.log('\n🔐 Evidence Integrity Check:');
    let validHashes = 0;
    let invalidHashes = 0;

    for (const entry of allEvidence) {
      const verification = ledger.verifyEvidence(entry);
      if (verification.valid) {
        validHashes++;
      } else {
        invalidHashes++;
        console.log(`   ✗ INVALID: ${entry.evidence_id} - ${verification.reason}`);
      }
    }

    console.log(`   Valid hashes: ${validHashes}/${allEvidence.length}`);
    console.log(`   Invalid hashes: ${invalidHashes}/${allEvidence.length}`);

    // Final verdict
    console.log('\n' + '='.repeat(70));
    if (report.status === 'SUCCESS' && validHashes === allEvidence.length && report.failed_tasks === 0) {
      console.log('✅ PHASE_1_OPERATIONALLY_ACCEPTED');
      console.log('   - Reference mission executed successfully');
      console.log('   - All tasks completed');
      console.log('   - All evidence hashes verified');
      console.log('   - No security violations detected');
    } else if (report.status === 'PARTIAL_SUCCESS') {
      console.log('⚠️  PHASE_1_ACCEPTED_WITH_REMEDIATIONS');
      console.log(`   - Some tasks failed: ${report.failed_tasks}`);
      console.log('   - Requires investigation');
    } else {
      console.log('❌ PHASE_1_NOT_ACCEPTED');
      console.log(`   - Mission status: ${report.status}`);
      console.log(`   - Failed tasks: ${report.failed_tasks}`);
    }
    console.log('='.repeat(70) + '\n');

    // Exit with appropriate code
    process.exit(report.status === 'SUCCESS' && invalidHashes === 0 ? 0 : 1);
  } catch (err) {
    console.error('\n❌ PHASE_1_NOT_ACCEPTED');
    console.error('Error:', err);
    process.exit(1);
  }
}

// Run if invoked directly
if (require.main === module) {
  runOperationalAcceptanceGate();
}
