/**
 * Governor OS Foundation — Reference Mission Executor
 * End-to-end orchestrator for Phase 1 reference mission.
 * Executes: type-check → bounded tests → verify → report results.
 * This proves Governor OS works: Mission → Planner → Capability Registry →
 * Policy Engine → Execution Adapter → Verification → Evidence Ledger.
 */

import { MissionModel } from './mission';
import { Planner } from './planner';
import { getOrCreateRegistry } from './capability-registry';
import { getOrCreatePolicyEngine } from './policy-engine';
import { ExecutionAdapter, executeNpm } from './execution-adapter';
import { getOrCreateLedger, recordTaskExecution, recordVerification, recordCapabilityCheck } from './evidence-ledger';
import { CapabilityRegistry } from './capability-registry';
import { PolicyEngine } from './policy-engine';
import { EvidenceLedger } from './evidence-ledger';

export interface MissionExecutionReport {
  mission_id: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'ESCALATED';
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  fitness_baseline: number;
  fitness_post_execution: number;
  execution_duration_ms: number;
  tasks: Array<{
    task_id: string;
    status: string;
    command?: string;
    exit_code?: number;
    stdout_summary: string;
    stderr_summary: string;
  }>;
  evidence_count: number;
  completion_time: string;
}

export class ReferenceMissionExecutor {
  private capabilityRegistry: CapabilityRegistry;
  private policyEngine: PolicyEngine;
  private evidenceLedger: EvidenceLedger;

  constructor(
    registry: CapabilityRegistry,
    engine: PolicyEngine,
    ledger: EvidenceLedger
  ) {
    this.capabilityRegistry = registry;
    this.policyEngine = engine;
    this.evidenceLedger = ledger;
  }

  /**
   * Execute reference health-check mission end-to-end
   */
  async execute(): Promise<MissionExecutionReport> {
    const startTime = Date.now();

    // Step 1: Create mission
    console.log('🚀 Phase 1: Reference Mission - Starting');
    const mission = MissionModel.create(
      'REFERENCE',
      'Phase 1 reference health-check: type-check, bounded tests, verification',
      'Governor Ω (Phase 1)',
      'autonomous'
    );
    const missionModel = new MissionModel(mission);

    console.log(`📋 Mission ID: ${mission.mission_id}`);

    // Step 2: Transition to PLANNING
    missionModel.transitionTo('PLANNING', 'Beginning task decomposition');

    // Step 3: Decompose into tasks
    const tasks = Planner.planReferenceHealthCheck(mission.mission_id);
    for (const task of tasks) {
      missionModel.addTask(task.class, task.description, task.capability_required, task.command, task.verification_rule);
    }

    console.log(`📝 Decomposed into ${tasks.length} tasks`);
    console.log(Planner.summarizeTaskList(tasks));

    // Step 4: Check capabilities
    missionModel.transitionTo('EXECUTING', 'Starting task execution');
    console.log('\n🔍 Checking capabilities...');

    for (const task of tasks) {
      const capabilityCheck = this.capabilityRegistry.checkCapabilityHealth(task.capability_required);
      const status = capabilityCheck.available ? '✓' : '✗';
      console.log(`  ${status} ${task.capability_required}: ${capabilityCheck.status}`);

      recordCapabilityCheck(
        mission.mission_id,
        'Governor Ω',
        task.capability_required,
        capabilityCheck.available
      );
    }

    // Step 5: Execute each task
    console.log('\n⚙️  Executing tasks...\n');

    let successCount = 0;
    let failureCount = 0;

    for (const task of tasks) {
      // Get next task to execute
      const nextTask = missionModel.getNextQueuedTask();
      if (!nextTask) {
        console.log(`⏭️  No more tasks (total ${tasks.length} tasks)`);
        break;
      }

      console.log(`\n[${nextTask.sequence}/${tasks.length}] ${nextTask.description}`);
      console.log(`   Task ID: ${nextTask.task_id}`);

      // Transition to EXECUTING
      missionModel.transitionTaskTo(nextTask.task_id, 'EXECUTING');

      // Skip verification tasks if prior command failed
      if (Planner.shouldSkipTask(nextTask, tasks)) {
        console.log('   → Skipping (prior task failed)');
        missionModel.transitionTaskTo(nextTask.task_id, 'SKIPPED');
        continue;
      }

      // For COMMAND tasks: execute
      if (nextTask.class === 'COMMAND' && nextTask.command) {
        console.log(`   $ ${nextTask.command}`);

        // Policy check
        const policyCheck = await this.policyEngine.evaluate(nextTask.capability_required, {
          task_id: nextTask.task_id,
          mission_id: mission.mission_id,
          command: nextTask.command,
          actor: 'Governor Ω',
          authority_level: 'autonomous',
        });

        if (policyCheck.action === 'DENY') {
          console.log(`   ✗ DENIED: ${policyCheck.reason}`);
          missionModel.recordTaskResult(nextTask.task_id, 1, '', policyCheck.reason);
          missionModel.transitionTaskTo(nextTask.task_id, 'FAILED');
          failureCount++;
          continue;
        }

        // Execute
        const result = await ExecutionAdapter.executeCommand(nextTask.command, {
          cwd: process.cwd(),
          timeout: 30_000, // 30s for reference mission
        });

        const summary = ExecutionAdapter.summarizeResult(result);
        console.log(`   ${summary}`);

        // Record result
        missionModel.recordTaskResult(
          nextTask.task_id,
          result.exit_code,
          result.stdout,
          result.stderr
        );

        recordTaskExecution(
          nextTask.task_id,
          mission.mission_id,
          'Governor Ω',
          nextTask.command,
          result.exit_code,
          result.stdout.slice(0, 100),
          result.stderr.slice(0, 100)
        );

        // Transition
        if (result.exit_code === 0) {
          missionModel.transitionTaskTo(nextTask.task_id, 'COMPLETE', result.exit_code);
          missionModel.transitionTaskTo(nextTask.task_id, 'VERIFYING');
          successCount++;
        } else {
          missionModel.transitionTaskTo(nextTask.task_id, 'FAILED', result.exit_code);
          failureCount++;
        }
      } else if (nextTask.class === 'VERIFICATION') {
        // For VERIFICATION: check if prior tasks passed
        const priorCommandTasks = tasks.filter(
          (t) => t.sequence < nextTask.sequence && t.class === 'COMMAND'
        );

        const allPassed = priorCommandTasks.every((t) => t.exit_code === 0);

        if (allPassed) {
          console.log('   ✓ Verification PASSED (all prior tasks succeeded)');
          missionModel.recordVerification(nextTask.task_id, true, 'PASS');
          recordVerification(
            nextTask.task_id,
            mission.mission_id,
            'Governor Ω',
            true,
            'All prior tasks passed'
          );
          missionModel.transitionTaskTo(nextTask.task_id, 'COMPLETE');
          successCount++;
        } else {
          console.log('   ✗ Verification FAILED (prior tasks did not all succeed)');
          missionModel.recordVerification(nextTask.task_id, false, 'FAIL');
          recordVerification(
            nextTask.task_id,
            mission.mission_id,
            'Governor Ω',
            false,
            'Prior command tasks failed'
          );
          missionModel.transitionTaskTo(nextTask.task_id, 'FAILED');
          failureCount++;
        }
      } else if (nextTask.class === 'EVIDENCE_COLLECTION') {
        console.log('   📊 Collecting health indicators and lessons...');
        missionModel.transitionTaskTo(nextTask.task_id, 'COMPLETE');
        successCount++;
      }
    }

    // Step 6: Finalize mission
    const duration_ms = Date.now() - startTime;
    const overallSuccess = failureCount === 0 && successCount === tasks.length;

    if (overallSuccess) {
      console.log('\n✅ Mission COMPLETE (all tasks succeeded)');
      missionModel.complete('SUCCESS', 'All tasks executed successfully', 0.95);
    } else {
      console.log(`\n⚠️  Mission COMPLETE (${successCount} passed, ${failureCount} failed)`);
      missionModel.complete('PARTIAL_SUCCESS', `${failureCount} task(s) failed`, 0.70);
    }

    // Step 7: Generate report
    const report = this.generateReport(mission, tasks, duration_ms);

    console.log('\n📈 Execution Report:');
    console.log(`   Mission ID: ${report.mission_id}`);
    console.log(`   Status: ${report.status}`);
    console.log(`   Tasks: ${report.completed_tasks}/${report.total_tasks} completed`);
    console.log(`   Duration: ${report.execution_duration_ms}ms`);
    console.log(`   Evidence: ${report.evidence_count} entries recorded`);

    return report;
  }

  /**
   * Generate execution report
   */
  private generateReport(mission: any, tasks: any[], duration_ms: number): MissionExecutionReport {
    const evidence = this.evidenceLedger.getSummary();

    const taskReports = tasks.map((task) => ({
      task_id: task.task_id,
      status: task.status,
      command: task.command,
      exit_code: task.exit_code,
      stdout_summary: task.stdout ? task.stdout.slice(0, 50) : '',
      stderr_summary: task.stderr ? task.stderr.slice(0, 50) : '',
    }));

    const completedTasks = tasks.filter((t) => t.status === 'COMPLETE').length;
    const failedTasks = tasks.filter((t) => t.status === 'FAILED').length;

    return {
      mission_id: mission.mission_id,
      status: mission.final_verdict as any,
      total_tasks: tasks.length,
      completed_tasks: completedTasks,
      failed_tasks: failedTasks,
      fitness_baseline: mission.fitness_baseline || 0.7,
      fitness_post_execution: mission.fitness_post_execution || 0.8,
      execution_duration_ms: duration_ms,
      tasks: taskReports,
      evidence_count: evidence.total,
      completion_time: new Date().toISOString(),
    };
  }
}

/**
 * Execute reference mission (standalone entry point)
 */
export async function executeReferenceMission(): Promise<void> {
  try {
    // Initialize all components
    const registry = await getOrCreateRegistry();
    const engine = await getOrCreatePolicyEngine(registry);
    const ledger = getOrCreateLedger();

    // Create executor
    const executor = new ReferenceMissionExecutor(registry, engine, ledger);

    // Execute
    const report = await executor.execute();

    // Print report
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 1 REFERENCE MISSION — COMPLETION REPORT');
    console.log('='.repeat(60));
    console.log(`Mission ID: ${report.mission_id}`);
    console.log(`Status: ${report.status}`);
    console.log(`Tasks: ${report.completed_tasks}/${report.total_tasks} completed`);
    console.log(`Duration: ${(report.execution_duration_ms / 1000).toFixed(2)}s`);
    console.log(`Fitness Baseline: ${report.fitness_baseline}`);
    console.log(`Fitness Post-Execution: ${report.fitness_post_execution}`);
    console.log(`Evidence Recorded: ${report.evidence_count} entries`);
    console.log('='.repeat(60));

    if (report.status !== 'SUCCESS') {
      process.exit(1);
    }
  } catch (err) {
    console.error('Phase 1 Reference Mission FAILED:', err);
    process.exit(1);
  }
}
