import { describe, it, expect } from 'vitest';
import { runOperationalAcceptanceGate } from '../lib/governor/test-runner';

describe('Phase 1 Operational Acceptance Gate', () => {
  it('should run the acceptance gate', async () => {
    // This test runs the acceptance gate and captures console output
    await expect(runOperationalAcceptanceGate()).resolves.not.toThrow();
  });
});
