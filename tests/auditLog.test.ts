import { afterEach, describe, expect, it, vi } from 'vitest';

const insert = vi.fn();
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({ from: () => ({ insert }) }),
}));

import { recordAuditEvent } from '@/lib/auditLog';

afterEach(() => vi.clearAllMocks());

describe('recordAuditEvent', () => {
  it('inserts an action with its detail', async () => {
    insert.mockResolvedValueOnce({ error: null });
    await recordAuditEvent({ action: 'history.clear_all', detail: { deleted: 3 } });
    expect(insert).toHaveBeenCalledWith({
      action: 'history.clear_all',
      detail: { deleted: 3 },
    });
  });

  it('defaults detail to an empty object', async () => {
    insert.mockResolvedValueOnce({ error: null });
    await recordAuditEvent({ action: 'x' });
    expect(insert).toHaveBeenCalledWith({ action: 'x', detail: {} });
  });

  it('never throws when the insert returns an error', async () => {
    insert.mockResolvedValueOnce({ error: { message: 'no such table' } });
    await expect(
      recordAuditEvent({ action: 'x' })
    ).resolves.toBeUndefined();
  });

  it('never throws when the client throws', async () => {
    insert.mockRejectedValueOnce(new Error('connection refused'));
    await expect(
      recordAuditEvent({ action: 'x' })
    ).resolves.toBeUndefined();
  });
});
