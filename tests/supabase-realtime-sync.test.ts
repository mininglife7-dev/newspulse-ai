import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeRealtimeSync,
  disconnectRealtimeSync,
  subscribeToTable,
  unsubscribeFromTable,
  onTableChange,
  broadcastRealtimeEvent,
  detectConflict,
  resolveConflict,
  getSyncState,
  getActiveSubscriptions,
  getRecentEvents,
  getActiveConflicts,
  formatSyncStatus,
  resetRealtimeSync,
} from '@/lib/supabase-realtime-sync';

describe('Supabase Realtime Sync - DNS-GOV-016', () => {
  beforeEach(() => {
    resetRealtimeSync();
  });

  describe('initializeRealtimeSync', () => {
    it('initializes sync connection', async () => {
      const status = initializeRealtimeSync();
      expect(status).toBe('connected');
    });

    it('sets lastSyncAt timestamp', () => {
      initializeRealtimeSync();
      const state = getSyncState();
      expect(state.lastSyncAt).toBeDefined();
    });

    it('resets error count', () => {
      initializeRealtimeSync();
      const state = getSyncState();
      expect(state.errorCount).toBe(0);
    });
  });

  describe('disconnectRealtimeSync', () => {
    it('disconnects from sync', () => {
      initializeRealtimeSync();
      disconnectRealtimeSync();
      const state = getSyncState();
      expect(state.status).toBe('disconnected');
      expect(state.connected).toBe(false);
    });

    it('clears subscriptions on disconnect', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');
      disconnectRealtimeSync();
      const subs = getActiveSubscriptions();
      expect(subs.length).toBe(0);
    });
  });

  describe('subscribeToTable', () => {
    it('creates subscription to table', () => {
      initializeRealtimeSync();
      const sub = subscribeToTable('workspace');

      expect(sub.table).toBe('workspace');
      expect(sub.event).toBe('*');
      expect(sub.active).toBe(true);
    });

    it('supports filtering subscriptions', () => {
      initializeRealtimeSync();
      const sub = subscribeToTable('workspace', 'UPDATE', 'user_id=eq.123');

      expect(sub.table).toBe('workspace');
      expect(sub.event).toBe('UPDATE');
      expect(sub.filter).toBe('user_id=eq.123');
    });

    it('generates unique subscription IDs', () => {
      initializeRealtimeSync();
      const sub1 = subscribeToTable('workspace');
      const sub2 = subscribeToTable('workspace');

      expect(sub1.id).not.toBe(sub2.id);
    });

    it('tracks subscription creation time', () => {
      initializeRealtimeSync();
      const before = new Date();
      const sub = subscribeToTable('workspace');
      const after = new Date();

      const subTime = new Date(sub.subscribedAt);
      expect(subTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(subTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('unsubscribeFromTable', () => {
    it('unsubscribes from table', () => {
      initializeRealtimeSync();
      const sub = subscribeToTable('workspace');
      const result = unsubscribeFromTable(sub.id);

      expect(result).toBe(true);
      const active = getActiveSubscriptions();
      expect(active.length).toBe(0);
    });

    it('returns false for non-existent subscription', () => {
      initializeRealtimeSync();
      const result = unsubscribeFromTable('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('broadcastRealtimeEvent', () => {
    it('broadcasts INSERT event', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      const event = broadcastRealtimeEvent(
        'workspace',
        'INSERT',
        undefined,
        { id: '1', name: 'Engineering' }
      );

      expect(event.table).toBe('workspace');
      expect(event.operation).toBe('INSERT');
      expect(event.after).toEqual({ id: '1', name: 'Engineering' });
    });

    it('broadcasts UPDATE event', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      const event = broadcastRealtimeEvent(
        'workspace',
        'UPDATE',
        { id: '1', name: 'Engineering' },
        { id: '1', name: 'Engineering Team' }
      );

      expect(event.operation).toBe('UPDATE');
      expect(event.before).toEqual({ id: '1', name: 'Engineering' });
      expect(event.after).toEqual({ id: '1', name: 'Engineering Team' });
    });

    it('broadcasts DELETE event', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      const event = broadcastRealtimeEvent('workspace', 'DELETE', { id: '1', name: 'Engineering' });

      expect(event.operation).toBe('DELETE');
      expect(event.before).toEqual({ id: '1', name: 'Engineering' });
      expect(event.after).toBeUndefined();
    });

    it('includes userId in event', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      const event = broadcastRealtimeEvent(
        'workspace',
        'UPDATE',
        { status: 'old' },
        { status: 'new' },
        'user-123'
      );

      expect(event.userId).toBe('user-123');
    });

    it('updates subscription lastEventAt', () => {
      initializeRealtimeSync();
      const sub = subscribeToTable('workspace');

      expect(sub.lastEventAt).toBeUndefined();

      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '1' });

      const updated = getActiveSubscriptions()[0];
      expect(updated.lastEventAt).toBeDefined();
    });

    it('notifies handlers of events', () => {
      return new Promise<void>((done) => {
        initializeRealtimeSync();
        subscribeToTable('workspace');

        onTableChange('workspace', (event) => {
          expect(event.table).toBe('workspace');
          expect(event.operation).toBe('INSERT');
          done();
        });

        broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '1' });
      });
    });

    it('maintains event history bounded at 1000', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      // Add 1100 events
      for (let i = 0; i < 1100; i++) {
        broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: `${i}` });
      }

      const events = getRecentEvents();
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('onTableChange', () => {
    it('registers event handler', () => {
      return new Promise<void>((done) => {
        initializeRealtimeSync();
        subscribeToTable('workspace');

        onTableChange('workspace', (event) => {
          expect(event.operation).toBe('INSERT');
          done();
        });

        broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '1' });
      });
    });

    it('returns unsubscribe function', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      let callCount = 0;
      const unsubscribe = onTableChange('workspace', () => {
        callCount++;
      });

      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '1' });
      expect(callCount).toBe(1);

      unsubscribe();

      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '2' });
      expect(callCount).toBe(1);
    });

    it('supports multiple handlers for same table', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      let handler1Called = false;
      let handler2Called = false;

      onTableChange('workspace', () => {
        handler1Called = true;
      });

      onTableChange('workspace', () => {
        handler2Called = true;
      });

      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '1' });

      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
    });
  });

  describe('detectConflict', () => {
    it('detects conflict between local and remote', () => {
      const conflict = detectConflict(
        'workspace',
        'ws-1',
        { name: 'Local Name', status: 'active' },
        { name: 'Remote Name', status: 'inactive' },
        'UPDATE'
      );

      expect(conflict.table).toBe('workspace');
      expect(conflict.recordId).toBe('ws-1');
      expect(conflict.operation).toBe('UPDATE');
    });

    it('stores conflict for retrieval', () => {
      detectConflict('workspace', 'ws-1', { name: 'Local' }, { name: 'Remote' }, 'UPDATE');

      const conflicts = getActiveConflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].recordId).toBe('ws-1');
    });

    it('detects INSERT conflicts', () => {
      const conflict = detectConflict(
        'workspace',
        'ws-new',
        { id: 'ws-new', name: 'New' },
        { id: 'ws-new', name: 'Different' },
        'INSERT'
      );

      expect(conflict.operation).toBe('INSERT');
    });

    it('detects DELETE conflicts', () => {
      const conflict = detectConflict(
        'workspace',
        'ws-1',
        { id: 'ws-1', name: 'Delete Me' },
        { id: 'ws-1', name: 'Don\'t Delete' },
        'DELETE'
      );

      expect(conflict.operation).toBe('DELETE');
    });
  });

  describe('resolveConflict', () => {
    it('resolves conflict with local strategy', () => {
      detectConflict('workspace', 'ws-1', { name: 'Local' }, { name: 'Remote' }, 'UPDATE');

      const resolved = resolveConflict('workspace', 'ws-1', 'local');

      expect(resolved?.resolvedBy).toBe('local');
      expect(resolved?.resolvedAt).toBeDefined();
    });

    it('resolves conflict with remote strategy', () => {
      detectConflict('workspace', 'ws-1', { name: 'Local' }, { name: 'Remote' }, 'UPDATE');

      const resolved = resolveConflict('workspace', 'ws-1', 'remote');

      expect(resolved?.resolvedBy).toBe('remote');
    });

    it('resolves conflict with merge strategy', () => {
      detectConflict(
        'workspace',
        'ws-1',
        { name: 'Local', status: 'active' },
        { name: 'Remote', status: 'inactive' },
        'UPDATE'
      );

      const merged = { name: 'Merged Name', status: 'active' };
      const resolved = resolveConflict('workspace', 'ws-1', 'merge', merged);

      expect(resolved?.resolvedBy).toBe('merge');
      expect(resolved?.after).toEqual(merged);
    });

    it('removes conflict from active list after resolution', () => {
      detectConflict('workspace', 'ws-1', { name: 'Local' }, { name: 'Remote' }, 'UPDATE');
      expect(getActiveConflicts().length).toBe(1);

      resolveConflict('workspace', 'ws-1', 'local');
      expect(getActiveConflicts().length).toBe(0);
    });

    it('returns undefined for non-existent conflict', () => {
      const resolved = resolveConflict('workspace', 'nonexistent', 'local');
      expect(resolved).toBeUndefined();
    });
  });

  describe('getSyncState', () => {
    it('returns current sync state', () => {
      initializeRealtimeSync();
      const state = getSyncState();

      expect(state.status).toBeDefined();
      expect(state.connected).toBe(true);
      expect(state.subscriptionCount).toBe(0);
      expect(state.eventCount).toBe(0);
      expect(state.errorCount).toBe(0);
    });

    it('tracks subscription count', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');
      subscribeToTable('users');

      const state = getSyncState();
      expect(state.subscriptionCount).toBe(2);
    });

    it('tracks event count', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '1' });
      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '2' });

      const state = getSyncState();
      expect(state.eventCount).toBe(2);
    });
  });

  describe('getActiveSubscriptions', () => {
    it('returns only active subscriptions', () => {
      initializeRealtimeSync();
      const sub1 = subscribeToTable('workspace');
      const sub2 = subscribeToTable('users');

      unsubscribeFromTable(sub1.id);

      const active = getActiveSubscriptions();
      expect(active.length).toBe(1);
      expect(active[0].table).toBe('users');
    });

    it('returns empty array when disconnected', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');
      disconnectRealtimeSync();

      const active = getActiveSubscriptions();
      expect(active.length).toBe(0);
    });
  });

  describe('getRecentEvents', () => {
    it('returns recent events in order', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      for (let i = 1; i <= 5; i++) {
        broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: `${i}` });
      }

      const recent = getRecentEvents();
      expect(recent.length).toBe(5);
      expect(recent[4].after?.id).toBe('5');
    });

    it('filters events by table', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');
      subscribeToTable('users');

      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: 'ws-1' });
      broadcastRealtimeEvent('users', 'INSERT', undefined, { id: 'user-1' });

      const workspaceEvents = getRecentEvents('workspace');
      expect(workspaceEvents.length).toBe(1);
      expect(workspaceEvents[0].table).toBe('workspace');
    });

    it('respects limit parameter', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      for (let i = 0; i < 100; i++) {
        broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: `${i}` });
      }

      const recent = getRecentEvents(undefined, 10);
      expect(recent.length).toBe(10);
    });
  });

  describe('formatSyncStatus', () => {
    it('shows connected status', () => {
      initializeRealtimeSync();
      const status = formatSyncStatus();

      expect(status).toContain('🟢');
      expect(status).toContain('[connected]');
    });

    it('shows subscription count', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');
      subscribeToTable('users');

      const status = formatSyncStatus();
      expect(status).toContain('2 subscriptions');
    });

    it('shows event count', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');
      broadcastRealtimeEvent('workspace', 'INSERT', undefined, { id: '1' });

      const status = formatSyncStatus();
      expect(status).toContain('event');
    });

    it('indicates conflicts', () => {
      initializeRealtimeSync();
      detectConflict('workspace', 'ws-1', { name: 'Local' }, { name: 'Remote' }, 'UPDATE');

      const status = formatSyncStatus();
      expect(status).toContain('conflict');
    });
  });

  describe('Integration: Real-time Collaboration Workflow', () => {
    it('simulates multi-user workspace updates', () => {
      return new Promise<void>((done) => {
        initializeRealtimeSync();
        subscribeToTable('workspace');

        const events: ReturnType<typeof broadcastRealtimeEvent>[] = [];

        onTableChange('workspace', (event) => {
          events.push(event);

          if (events.length === 3) {
            // Verify all 3 updates were received
            expect(events[0].after?.status).toBe('created');
            expect(events[1].after?.status).toBe('active');
            expect(events[2].after?.members).toBeDefined();
            done();
          }
        });

        // User 1 creates workspace
        broadcastRealtimeEvent(
          'workspace',
          'INSERT',
          undefined,
          { id: 'ws-1', name: 'Engineering', status: 'created' },
          'user-1'
        );

        // User 1 activates workspace
        broadcastRealtimeEvent(
          'workspace',
          'UPDATE',
          { status: 'created' },
          { status: 'active' },
          'user-1'
        );

        // User 2 adds members
        broadcastRealtimeEvent(
          'workspace',
          'UPDATE',
          { members: [] },
          { members: ['user-2', 'user-3'] },
          'user-2'
        );
      });
    });

    it('detects and resolves concurrent edits', () => {
      initializeRealtimeSync();
      subscribeToTable('workspace');

      // Local change
      const localUpdate = { name: 'Local Name', status: 'active' };
      // Remote change from other user
      const remoteUpdate = { name: 'Remote Name', status: 'inactive' };

      // Detect conflict
      detectConflict('workspace', 'ws-1', localUpdate, remoteUpdate, 'UPDATE');
      let conflicts = getActiveConflicts();
      expect(conflicts.length).toBe(1);

      // Resolve with merge
      const merged = { name: 'Local Name', status: 'active' }; // Prefer local name + remote status
      resolveConflict('workspace', 'ws-1', 'merge', merged);

      conflicts = getActiveConflicts();
      expect(conflicts.length).toBe(0);
    });
  });
});
