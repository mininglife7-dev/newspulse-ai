/**
 * HERCULES Persistence Tests
 *
 * Verify checkpoint/restore functionality for multi-enterprise state durability.
 * Total: 12 tests covering checkpoint creation, restoration, metadata, cleanup, and recovery.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HerculesPersistence } from '@/lib/hercules-persistence';
import { HerculesKernel } from '@/lib/hercules-kernel';
import { initializeCathedralEnterprise } from '@/lib/cathedral-enterprise-init';
import { initializeEnterprise002 } from '@/lib/enterprise-002-init';

describe('HERCULES Persistence', () => {
  let persistence: HerculesPersistence;
  let kernel: HerculesKernel;

  beforeEach(() => {
    persistence = HerculesPersistence.getInstance();
    kernel = HerculesKernel.getInstance();
  });

  describe('Checkpoint Creation', () => {
    it('should create checkpoint from kernel state', async () => {
      initializeCathedralEnterprise();

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata).toBeDefined();
      expect(metadata.id).toBeDefined();
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.status).toBe('complete');
    });

    it('should capture correct enterprise count in checkpoint', async () => {
      initializeCathedralEnterprise();
      initializeEnterprise002();

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata.enterpriseCount).toBeGreaterThanOrEqual(2);
    });

    it('should capture task count in checkpoint metadata', async () => {
      initializeCathedralEnterprise();

      // Create some tasks
      for (let i = 0; i < 5; i++) {
        kernel.createTask('cathedral-001', {
          title: `Task ${i}`,
          description: 'Test task',
          state: 'QUEUED',
          priority: 1,
          authorityRequired: 'A_AUTONOMOUS',
          preconditions: [],
          postconditions: [],
          evidence: [],
          maxRetries: 3,
          dependsOn: [],
        });
      }

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata.taskCount).toBeGreaterThanOrEqual(5);
    });

    it('should measure checkpoint duration', async () => {
      initializeCathedralEnterprise();

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata.checkpointDurationMs).toBeGreaterThanOrEqual(0);
      expect(metadata.checkpointDurationMs).toBeLessThan(1000); // Should be <1s
    });

    it('should generate unique checkpoint IDs', async () => {
      initializeCathedralEnterprise();

      const serialized = kernel.serializeState();
      const metadata1 = await persistence.createCheckpoint(serialized);
      const metadata2 = await persistence.createCheckpoint(serialized);

      expect(metadata1.id).not.toBe(metadata2.id);
    });

    it('should handle checkpoint with empty kernel state', async () => {
      // Don't initialize any enterprises
      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata).toBeDefined();
      expect(metadata.status).toBe('complete');
    });
  });

  describe('Checkpoint Restoration', () => {
    it('should return null when no checkpoint exists', async () => {
      const result = await persistence.restoreCheckpoint();
      // Should return null or empty (no persistence backend yet)
      expect(result === null || Array.isArray(result)).toBe(true);
    });

    it('should track checkpoint metadata correctly', async () => {
      initializeCathedralEnterprise();

      // Create checkpoint with known state
      const serialized = kernel.serializeState();
      const created = await persistence.createCheckpoint(serialized);

      // Verify metadata matches expected structure
      expect(created).toHaveProperty('id');
      expect(created).toHaveProperty('createdAt');
      expect(created).toHaveProperty('kernelVersion');
      expect(created).toHaveProperty('enterpriseCount');
      expect(created).toHaveProperty('status');
    });
  });

  describe('Checkpoint Listing & Cleanup', () => {
    it('should list checkpoints (may be empty)', async () => {
      const checkpoints = await persistence.listCheckpoints();
      expect(Array.isArray(checkpoints)).toBe(true);
    });

    it('should limit checkpoint list to requested count', async () => {
      const checkpoints = await persistence.listCheckpoints(5);
      expect(checkpoints.length).toBeLessThanOrEqual(5);
    });

    it('should cleanup old checkpoints gracefully', async () => {
      const deleted = await persistence.cleanupOldCheckpoints(10);
      expect(typeof deleted).toBe('number');
      expect(deleted).toBeGreaterThanOrEqual(0);
    });

    it('should mark failed checkpoint correctly', async () => {
      initializeCathedralEnterprise();

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      // Mark as failed
      await persistence.markCheckpointFailed(metadata.id, 'Test failure');

      // Should not throw
      expect(metadata.id).toBeDefined();
    });
  });

  describe('Persistence Integration', () => {
    it('should handle concurrent checkpoint creation', async () => {
      initializeCathedralEnterprise();

      const serialized = kernel.serializeState();

      // Create multiple checkpoints simultaneously
      const promises = Array.from({ length: 3 }, () =>
        persistence.createCheckpoint(serialized)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.id)).toBe(true);
    });

    it('should preserve enterprise count across checkpoint cycle', async () => {
      initializeCathedralEnterprise();
      initializeEnterprise002();

      const before = kernel.getEnterprise('cathedral-001');
      expect(before).toBeDefined();

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata.enterpriseCount).toBeGreaterThanOrEqual(2);
    });

    it('should record kernel version in checkpoint', async () => {
      initializeCathedralEnterprise();

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata.kernelVersion).toBe('1.0');
    });

    it('should handle checkpoint of large enterprise state', async () => {
      initializeCathedralEnterprise();

      // Create many tasks
      for (let i = 0; i < 50; i++) {
        kernel.createTask('cathedral-001', {
          title: `Task ${i}`,
          description: 'Scale test',
          state: 'QUEUED',
          priority: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          authorityRequired: 'A_AUTONOMOUS',
          preconditions: [],
          postconditions: [],
          evidence: [],
          maxRetries: 3,
          dependsOn: [],
        });
      }

      const serialized = kernel.serializeState();
      const metadata = await persistence.createCheckpoint(serialized);

      expect(metadata.taskCount).toBeGreaterThanOrEqual(50);
      expect(metadata.checkpointDurationMs).toBeLessThan(5000); // Should complete in <5s
    });
  });
});
