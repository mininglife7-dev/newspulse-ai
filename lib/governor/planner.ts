/**
 * Governor OS Foundation — Planner
 * Decomposes missions into task sequences (deterministic for same mission + repo state).
 * Planner is the "how do we break this down?" component.
 */

import { Mission, Task, TaskClass } from './types';
import { MissionModel } from './mission';

export class Planner {
  /**
   * Plan a reference health-check mission
   * Decomposes into: type-check, bounded test suite, report results
   */
  static planReferenceHealthCheck(missionId: string): Task[] {
    const tasks: Task[] = [];

    // Task 1: Type-check (TypeScript compiler)
    tasks.push({
      task_id: `${missionId}-01`,
      mission_id: missionId,
      sequence: 1,
      class: 'COMMAND' as TaskClass,
      description: 'Run TypeScript compiler (strict mode)',
      capability_required: 'type_checking',
      command: 'npm run type-check',
      expected_exit_code: 0,
      status: 'QUEUED',
    });

    // Task 2: Run subset of unit tests (vitest)
    tasks.push({
      task_id: `${missionId}-02`,
      mission_id: missionId,
      sequence: 2,
      class: 'COMMAND' as TaskClass,
      description: 'Run bounded test suite (5 test files max)',
      capability_required: 'test_execution',
      command: 'npm test -- --run --reporter=verbose 2>&1 | head -200',
      expected_exit_code: 0,
      status: 'QUEUED',
    });

    // Task 3: Verification — check both tasks passed
    tasks.push({
      task_id: `${missionId}-03`,
      mission_id: missionId,
      sequence: 3,
      class: 'VERIFICATION' as TaskClass,
      description: 'Verify type-check and tests passed',
      capability_required: 'repository_read',
      verification_rule: 'all_prior_tasks_exit_0',
      status: 'QUEUED',
    });

    // Task 4: Report results
    tasks.push({
      task_id: `${missionId}-04`,
      mission_id: missionId,
      sequence: 4,
      class: 'EVIDENCE_COLLECTION' as TaskClass,
      description: 'Collect health indicators and lessons',
      capability_required: 'local_persistence',
      status: 'QUEUED',
    });

    return tasks;
  }

  /**
   * Plan a compliance assessment mission
   * Decomposes into: evidence collection, assessment, report generation
   */
  static planComplianceAssessment(missionId: string, obligations: string[]): Task[] {
    const tasks: Task[] = [];

    // Task 1: Collect evidence for each obligation
    tasks.push({
      task_id: `${missionId}-01`,
      mission_id: missionId,
      sequence: 1,
      class: 'COMMAND' as TaskClass,
      description: `Collect evidence for ${obligations.length} obligations`,
      capability_required: 'compliance_analysis',
      status: 'QUEUED',
    });

    // Task 2: Assess risk per obligation
    tasks.push({
      task_id: `${missionId}-02`,
      mission_id: missionId,
      sequence: 2,
      class: 'COMMAND' as TaskClass,
      description: 'Classify risk levels (High/Medium/Low)',
      capability_required: 'compliance_analysis',
      status: 'QUEUED',
    });

    // Task 3: Generate compliance report
    tasks.push({
      task_id: `${missionId}-03`,
      mission_id: missionId,
      sequence: 3,
      class: 'COMMAND' as TaskClass,
      description: 'Generate compliance report PDF',
      capability_required: 'report_generation',
      status: 'QUEUED',
    });

    // Task 4: Verify with customer
    tasks.push({
      task_id: `${missionId}-04`,
      mission_id: missionId,
      sequence: 4,
      class: 'VERIFICATION' as TaskClass,
      description: 'Customer confirms report accuracy',
      capability_required: 'repository_read',
      verification_rule: 'customer_confirmed',
      status: 'QUEUED',
    });

    return tasks;
  }

  /**
   * Plan an evolution mission
   * Decomposes into: test change in sandbox, measure baseline, verify fitness
   */
  static planEvolutionMission(
    missionId: string,
    changeDescription: string,
    changeClass: 'operational' | 'organ' | 'genome' | 'dna'
  ): Task[] {
    const tasks: Task[] = [];

    // Task 1: Baseline measurement
    tasks.push({
      task_id: `${missionId}-01`,
      mission_id: missionId,
      sequence: 1,
      class: 'COMMAND' as TaskClass,
      description: 'Measure baseline fitness (before change)',
      capability_required: 'repository_read',
      status: 'QUEUED',
    });

    // Task 2: Apply change in sandbox
    tasks.push({
      task_id: `${missionId}-02`,
      mission_id: missionId,
      sequence: 2,
      class: 'COMMAND' as TaskClass,
      description: `Apply ${changeClass} change: ${changeDescription}`,
      capability_required: 'approved_command_execution',
      status: 'QUEUED',
    });

    // Task 3: Test change
    tasks.push({
      task_id: `${missionId}-03`,
      mission_id: missionId,
      sequence: 3,
      class: 'COMMAND' as TaskClass,
      description: 'Run tests with change applied',
      capability_required: 'test_execution',
      status: 'QUEUED',
    });

    // Task 4: Measure fitness post-change
    tasks.push({
      task_id: `${missionId}-04`,
      mission_id: missionId,
      sequence: 4,
      class: 'COMMAND' as TaskClass,
      description: 'Measure fitness after change',
      capability_required: 'repository_read',
      status: 'QUEUED',
    });

    // Task 5: Verification — fitness improved or stable
    tasks.push({
      task_id: `${missionId}-05`,
      mission_id: missionId,
      sequence: 5,
      class: 'VERIFICATION' as TaskClass,
      description: 'Verify fitness not regressed',
      capability_required: 'repository_read',
      verification_rule: 'fitness_baseline_or_improved',
      status: 'QUEUED',
    });

    return tasks;
  }

  /**
   * Decompose mission into task list (deterministic for same mission + repo state)
   */
  static decompose(mission: Mission): Task[] {
    const taskList: Task[] = [];

    switch (mission.class) {
      case 'REFERENCE':
        return this.planReferenceHealthCheck(mission.mission_id);

      case 'COMPLIANCE':
        // Placeholder; would extract obligations from mission context
        return this.planComplianceAssessment(mission.mission_id, []);

      case 'EVOLUTION':
        // Placeholder; would extract change description from mission context
        return this.planEvolutionMission(
          mission.mission_id,
          'Change to be applied',
          'operational'
        );

      default:
        // Unknown mission class — return minimal task
        return [
          {
            task_id: `${mission.mission_id}-01`,
            mission_id: mission.mission_id,
            sequence: 1,
            class: 'VERIFICATION' as TaskClass,
            description: `Verify mission ${mission.mission_id}`,
            capability_required: 'repository_read',
            status: 'QUEUED',
          },
        ];
    }
  }

  /**
   * Get task sequence (tasks in order)
   */
  static getSequence(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Get next task to execute (deterministic task scheduling)
   */
  static getNextTask(tasks: Task[]): Task | undefined {
    const queued = tasks.filter((t) => t.status === 'QUEUED');
    if (queued.length === 0) {
      return undefined;
    }

    // Return first queued task in sequence order
    return queued.sort((a, b) => a.sequence - b.sequence)[0];
  }

  /**
   * Check if task can proceed (all dependencies complete)
   */
  static canProceedWithTask(task: Task, allTasks: Task[]): boolean {
    // Tasks depend on all prior tasks being COMPLETE or SKIPPED
    const priorTasks = allTasks.filter((t) => t.sequence < task.sequence);

    return priorTasks.every(
      (t) => t.status === 'COMPLETE' || t.status === 'SKIPPED'
    );
  }

  /**
   * Mark task as blocked (cannot proceed yet)
   */
  static shouldSkipTask(task: Task, allTasks: Task[]): boolean {
    // Skip verification tasks if prior command tasks failed
    if (task.class === 'VERIFICATION') {
      const priorCommandTasks = allTasks.filter(
        (t) => t.sequence < task.sequence && t.class === 'COMMAND'
      );

      return priorCommandTasks.some((t) => t.status === 'FAILED');
    }

    return false;
  }

  /**
   * Get task summary for logging
   */
  static summarizeTaskList(tasks: Task[]): string {
    const summary = tasks
      .map((t) => `${t.sequence}. [${t.class}] ${t.description}`)
      .join('\n');

    return `Mission task sequence:\n${summary}`;
  }
}
