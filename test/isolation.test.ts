import { describe, it, expect } from 'vitest';
import {
  saveSearch,
  getSearchHistory,
  getSearchById,
  deleteSearchById,
  clearAllHistory,
} from '@/lib/supabase';
import { makeMockClient, makeRow } from './helpers/mockSupabase';

// These tests prove CROSS-USER ISOLATION at the data-access layer. The mock
// client enforces `.eq('user_id', …)` for real, so a leak would fail here.

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('tenant isolation — reads', () => {
  it('getSearchHistory returns only the caller’s rows', async () => {
    const client = makeMockClient([
      makeRow({ id: 'a1', user_id: USER_A, keyword: 'a-one' }),
      makeRow({ id: 'a2', user_id: USER_A, keyword: 'a-two' }),
      makeRow({ id: 'b1', user_id: USER_B, keyword: 'b-secret' }),
    ]) as any;

    const aHistory = await getSearchHistory(USER_A, 50, client);
    expect(aHistory.map((r) => r.id).sort()).toEqual(['a1', 'a2']);
    expect(aHistory.some((r) => r.user_id === USER_B)).toBe(false);

    const bHistory = await getSearchHistory(USER_B, 50, client);
    expect(bHistory.map((r) => r.id)).toEqual(['b1']);
  });

  it('getSearchById will not return another user’s row', async () => {
    const client = makeMockClient([
      makeRow({ id: 'b1', user_id: USER_B, keyword: 'b-secret' }),
    ]) as any;

    // User A asks for User B's row by id → must be null (no leak).
    const asA = await getSearchById(USER_A, 'b1', client);
    expect(asA).toBeNull();

    // The rightful owner can read it.
    const asB = await getSearchById(USER_B, 'b1', client);
    expect(asB?.id).toBe('b1');
  });

  it('getSearchHistory returns [] when userId is missing', async () => {
    const client = makeMockClient([makeRow({ user_id: USER_A })]) as any;
    expect(await getSearchHistory('', 50, client)).toEqual([]);
  });
});

describe('tenant isolation — writes & deletes', () => {
  it('saveSearch stamps the owner and refuses without a userId', async () => {
    const client = makeMockClient([]) as any;
    const row = await saveSearch(USER_A, 'hello', [], client);
    expect(row?.user_id).toBe(USER_A);
    expect(client.rows).toHaveLength(1);

    const refused = await saveSearch('', 'nope', [], client);
    expect(refused).toBeNull();
    expect(client.rows).toHaveLength(1); // nothing added
  });

  it('deleteSearchById cannot delete another user’s row', async () => {
    const client = makeMockClient([
      makeRow({ id: 'b1', user_id: USER_B }),
    ]) as any;

    // Attacker (User A) tries to delete User B's row by id.
    const attempt = await deleteSearchById(USER_A, 'b1', client);
    expect(attempt.ok).toBe(false);
    expect(attempt.error).toBe('Search not found.');
    expect(client.rows).toHaveLength(1); // row survives

    // Owner can delete it.
    const owned = await deleteSearchById(USER_B, 'b1', client);
    expect(owned.ok).toBe(true);
    expect(client.rows).toHaveLength(0);
  });

  it('clearAllHistory deletes only the caller’s rows', async () => {
    const client = makeMockClient([
      makeRow({ id: 'a1', user_id: USER_A }),
      makeRow({ id: 'a2', user_id: USER_A }),
      makeRow({ id: 'b1', user_id: USER_B }),
    ]) as any;

    const res = await clearAllHistory(USER_A, client);
    expect(res.ok).toBe(true);
    expect(res.deleted).toBe(2);
    // User B's row is untouched.
    expect(client.rows.map((r: any) => r.id)).toEqual(['b1']);
  });

  it('clearAllHistory refuses without a userId', async () => {
    const client = makeMockClient([makeRow({ user_id: USER_A })]) as any;
    const res = await clearAllHistory('', client);
    expect(res.ok).toBe(false);
    expect(client.rows).toHaveLength(1);
  });
});
