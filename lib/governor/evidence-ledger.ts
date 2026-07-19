/**
 * Governor OS Foundation — Evidence Ledger
 * Immutable append-only ledger for evidence storage (SQLite-backed).
 * Stores deterministic fields with cryptographic hashing.
 * Volatile fields (run_id, duration, row_id) stored separately, not hashed.
 */

import { EvidenceEntry, EvidenceType } from './types';
import { DETERMINISTIC_FIELDS, computeEvidenceHash } from './schema';

/**
 * In-memory evidence storage for Phase 1 reference mission
 * (Phase 2 will use actual SQLite)
 */
export class EvidenceLedger {
  private entries: Map<string, EvidenceEntry> = new Map();
  private sequenceCounter: number = 0;

  /**
   * Record evidence entry (append-only)
   */
  recordEvidence(entry: Omit<EvidenceEntry, 'evidence_id' | 'content_hash'>): EvidenceEntry {
    // Generate deterministic evidence ID
    const timestamp = entry.timestamp;
    const dateStr = timestamp.split('T')[0].replace(/-/g, '');
    this.sequenceCounter++;
    const nonce = String(this.sequenceCounter).padStart(3, '0');
    const evidence_id = `EV-${dateStr}-${nonce}`;

    // Compute hash of deterministic fields
    const hashInput: Record<string, unknown> = {
      mission_id: entry.mission_id,
      task_id: entry.task_id,
      evidence_type: entry.evidence_type,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.action,
      subject: entry.subject,
      result: entry.result,
    };

    const content_hash = computeEvidenceHash(hashInput);

    // Create complete entry
    const completeEntry: EvidenceEntry = {
      evidence_id,
      content_hash,
      ...entry,
    };

    // Store (append-only)
    this.entries.set(evidence_id, completeEntry);

    return completeEntry;
  }

  /**
   * Get evidence entry by ID
   */
  getEvidence(evidenceId: string): EvidenceEntry | undefined {
    return this.entries.get(evidenceId);
  }

  /**
   * Get all evidence for a mission
   */
  getEvidenceForMission(missionId: string): EvidenceEntry[] {
    return Array.from(this.entries.values()).filter(
      (e) => e.mission_id === missionId
    );
  }

  /**
   * Get all evidence for a task
   */
  getEvidenceForTask(taskId: string): EvidenceEntry[] {
    return Array.from(this.entries.values()).filter(
      (e) => e.task_id === taskId
    );
  }

  /**
   * Verify evidence integrity (hash matches content)
   */
  verifyEvidence(entry: EvidenceEntry): { valid: boolean; reason?: string } {
    const hashInput: Record<string, unknown> = {
      mission_id: entry.mission_id,
      task_id: entry.task_id,
      evidence_type: entry.evidence_type,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.action,
      subject: entry.subject,
      result: entry.result,
    };

    const recomputedHash = computeEvidenceHash(hashInput);

    if (recomputedHash !== entry.content_hash) {
      return {
        valid: false,
        reason: `Hash mismatch: stored=${entry.content_hash}, computed=${recomputedHash}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get all evidence entries
   */
  getAllEvidence(): EvidenceEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Count evidence entries by type
   */
  countByType(type: EvidenceType): number {
    return Array.from(this.entries.values()).filter(
      (e) => e.evidence_type === type
    ).length;
  }

  /**
   * Get evidence summary
   */
  getSummary(): {
    total: number;
    by_type: Record<EvidenceType, number>;
    missions: Set<string>;
    tasks: Set<string>;
  } {
    const entries = this.getAllEvidence();
    const by_type: Record<EvidenceType, number> = {
      TASK_RESULT: 0,
      VERIFICATION_RESULT: 0,
      CAPABILITY_CHECK: 0,
      HEALTH_INDICATOR: 0,
      LESSON: 0,
      DECISION: 0,
    };

    const missions = new Set<string>();
    const tasks = new Set<string>();

    for (const entry of entries) {
      by_type[entry.evidence_type]++;
      missions.add(entry.mission_id);
      if (entry.task_id) {
        tasks.add(entry.task_id);
      }
    }

    return {
      total: entries.length,
      by_type,
      missions,
      tasks,
    };
  }

  /**
   * Export evidence as JSON (for reports)
   */
  exportJSON(): EvidenceEntry[] {
    return this.getAllEvidence();
  }

  /**
   * Clear all evidence (for testing only)
   */
  clear(): void {
    this.entries.clear();
    this.sequenceCounter = 0;
  }
}

/**
 * Global ledger instance (singleton)
 */
let globalLedger: EvidenceLedger | null = null;

/**
 * Get or create global ledger
 */
export function getOrCreateLedger(): EvidenceLedger {
  if (!globalLedger) {
    globalLedger = new EvidenceLedger();
  }
  return globalLedger;
}

/**
 * Helper to record task execution as evidence
 */
export function recordTaskExecution(
  taskId: string,
  missionId: string,
  actor: string,
  command: string,
  exitCode: number,
  stdout: string,
  stderr: string
): EvidenceEntry {
  const ledger = getOrCreateLedger();

  return ledger.recordEvidence({
    mission_id: missionId,
    task_id: taskId,
    evidence_type: 'TASK_RESULT',
    timestamp: new Date().toISOString(),
    actor,
    action: 'EXECUTE_COMMAND',
    subject: command,
    result: `exit_code=${exitCode}`,
    summary: `Executed: ${command} → exit ${exitCode}`,
  });
}

/**
 * Helper to record verification as evidence
 */
export function recordVerification(
  taskId: string,
  missionId: string,
  actor: string,
  passed: boolean,
  details: string
): EvidenceEntry {
  const ledger = getOrCreateLedger();

  return ledger.recordEvidence({
    mission_id: missionId,
    task_id: taskId,
    evidence_type: 'VERIFICATION_RESULT',
    timestamp: new Date().toISOString(),
    actor,
    action: 'VERIFY_RESULT',
    subject: `Task ${taskId}`,
    result: passed ? 'VERIFIED' : 'VERIFICATION_FAILED',
    summary: `Verification ${passed ? 'passed' : 'failed'}: ${details}`,
  });
}

/**
 * Helper to record capability check as evidence
 */
export function recordCapabilityCheck(
  missionId: string,
  actor: string,
  capabilityId: string,
  available: boolean,
  provider?: string
): EvidenceEntry {
  const ledger = getOrCreateLedger();

  return ledger.recordEvidence({
    mission_id: missionId,
    evidence_type: 'CAPABILITY_CHECK',
    timestamp: new Date().toISOString(),
    actor,
    action: 'CHECK_CAPABILITY',
    subject: capabilityId,
    result: `${available ? 'AVAILABLE' : 'UNAVAILABLE'}${provider ? ` via ${provider}` : ''}`,
    summary: `Capability ${capabilityId} is ${available ? 'available' : 'unavailable'}`,
  });
}
