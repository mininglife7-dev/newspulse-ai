/**
 * DNA-GOV-016: Supabase Realtime Sync
 *
 * Enable real-time collaborative features: live workspace updates, multi-user
 * notifications, and subscription-based event synchronization. When a colleague
 * updates data, all connected users see changes immediately.
 *
 * Problem: Workspace data updates require page refresh to see changes. No
 * real-time collaboration. Multi-user workflows blocked; users don't know when
 * data changes remotely. We need: live update subscriptions, change notifications,
 * conflict detection, and automatic UI refresh on remote changes.
 */

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
export type SyncStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

export interface RealtimeSubscription {
  id: string;
  table: string;
  event: RealtimeEvent;
  filter?: string; // e.g., "user_id=eq.123"
  active: boolean;
  subscribedAt: string;
  lastEventAt?: string;
}

export interface RealtimeEvent_v {
  id: string;
  timestamp: string;
  table: string;
  operation: RealtimeEvent;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  userId?: string;
  commitId?: string;
}

export interface RealtimeSyncState {
  status: SyncStatus;
  subscriptions: Map<string, RealtimeSubscription>;
  eventHistory: RealtimeEvent_v[];
  lastSyncAt?: string;
  errorCount: number;
  lastError?: string;
}

export interface RealtimeConflict {
  table: string;
  recordId: string;
  operation: RealtimeEvent;
  localValue?: Record<string, unknown>;
  remoteValue?: Record<string, unknown>;
  resolvedAt?: string;
  resolvedBy?: 'local' | 'remote' | 'merge';
  after?: Record<string, unknown>;
}

// In-memory sync state (would integrate with actual Supabase client in production)
const syncState: RealtimeSyncState = {
  status: 'disconnected',
  subscriptions: new Map(),
  eventHistory: [],
  errorCount: 0,
};

const conflicts: Map<string, RealtimeConflict> = new Map();
const eventHandlers: Map<string, Set<(event: RealtimeEvent_v) => void>> = new Map();
let subscriptionCounter = 0;

/**
 * Initialize realtime sync connection
 */
export function initializeRealtimeSync(): SyncStatus {
  syncState.status = 'connected';
  syncState.lastSyncAt = new Date().toISOString();
  syncState.errorCount = 0;

  return syncState.status;
}

/**
 * Disconnect from realtime sync
 */
export function disconnectRealtimeSync(): void {
  syncState.status = 'disconnected';
  syncState.subscriptions.clear();
  eventHandlers.clear();
}

/**
 * Subscribe to realtime updates for a table
 */
export function subscribeToTable(
  table: string,
  event: RealtimeEvent = '*',
  filter?: string
): RealtimeSubscription {
  subscriptionCounter++;
  const subscriptionId = `sub-${table}-${event}-${subscriptionCounter}`;

  const subscription: RealtimeSubscription = {
    id: subscriptionId,
    table,
    event,
    filter,
    active: true,
    subscribedAt: new Date().toISOString(),
  };

  syncState.subscriptions.set(subscriptionId, subscription);

  // Initialize event handler for this subscription
  if (!eventHandlers.has(table)) {
    eventHandlers.set(table, new Set());
  }

  return subscription;
}

/**
 * Unsubscribe from realtime updates
 */
export function unsubscribeFromTable(subscriptionId: string): boolean {
  const subscription = syncState.subscriptions.get(subscriptionId);
  if (!subscription) return false;

  subscription.active = false;
  syncState.subscriptions.delete(subscriptionId);
  return true;
}

/**
 * Register event handler for a table
 */
export function onTableChange(
  table: string,
  handler: (event: RealtimeEvent_v) => void
): () => void {
  if (!eventHandlers.has(table)) {
    eventHandlers.set(table, new Set());
  }

  eventHandlers.get(table)!.add(handler);

  // Return unsubscribe function
  return () => {
    eventHandlers.get(table)?.delete(handler);
  };
}

/**
 * Broadcast a realtime event to all subscribers
 */
export function broadcastRealtimeEvent(
  table: string,
  operation: RealtimeEvent,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  userId?: string
): RealtimeEvent_v {
  const event: RealtimeEvent_v = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    table,
    operation,
    before,
    after,
    userId,
  };

  syncState.eventHistory.push(event);

  // Keep history bounded
  if (syncState.eventHistory.length > 1000) {
    syncState.eventHistory.shift();
  }

  // Notify all handlers for this table
  const handlers = eventHandlers.get(table) || new Set();
  handlers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      console.error(`Error in realtime handler for ${table}:`, err);
      syncState.errorCount++;
      syncState.lastError = err instanceof Error ? err.message : 'Unknown error';
    }
  });

  // Update subscription last event time
  syncState.subscriptions.forEach((sub) => {
    if (sub.table === table && (sub.event === '*' || sub.event === operation)) {
      sub.lastEventAt = event.timestamp;
    }
  });

  return event;
}

/**
 * Detect conflicts between local and remote changes
 */
export function detectConflict(
  table: string,
  recordId: string,
  localValue: Record<string, unknown>,
  remoteValue: Record<string, unknown>,
  operation: RealtimeEvent
): RealtimeConflict {
  const conflictId = `${table}-${recordId}`;

  const conflict: RealtimeConflict = {
    table,
    recordId,
    operation,
    localValue,
    remoteValue,
  };

  conflicts.set(conflictId, conflict);
  return conflict;
}

/**
 * Resolve conflict (choose local, remote, or merge)
 */
export function resolveConflict(
  table: string,
  recordId: string,
  strategy: 'local' | 'remote' | 'merge',
  mergedValue?: Record<string, unknown>
): RealtimeConflict | undefined {
  const conflictId = `${table}-${recordId}`;
  const conflict = conflicts.get(conflictId);

  if (!conflict) return undefined;

  conflict.resolvedAt = new Date().toISOString();
  conflict.resolvedBy = strategy;

  // For merge strategy, use provided merged value
  if (strategy === 'merge' && mergedValue) {
    conflict.after = mergedValue;
  }

  conflicts.delete(conflictId);
  return conflict;
}

/**
 * Get current sync state
 */
export function getSyncState(): {
  status: SyncStatus;
  connected: boolean;
  subscriptionCount: number;
  eventCount: number;
  errorCount: number;
  lastSyncAt?: string;
  lastError?: string;
} {
  return {
    status: syncState.status,
    connected: syncState.status === 'connected',
    subscriptionCount: syncState.subscriptions.size,
    eventCount: syncState.eventHistory.length,
    errorCount: syncState.errorCount,
    lastSyncAt: syncState.lastSyncAt,
    lastError: syncState.lastError,
  };
}

/**
 * Get active subscriptions
 */
export function getActiveSubscriptions(): RealtimeSubscription[] {
  return Array.from(syncState.subscriptions.values()).filter((sub) => sub.active);
}

/**
 * Get recent events
 */
export function getRecentEvents(table?: string, limit: number = 50): RealtimeEvent_v[] {
  let events = syncState.eventHistory;

  if (table) {
    events = events.filter((e) => e.table === table);
  }

  return events.slice(-limit);
}

/**
 * Get active conflicts
 */
export function getActiveConflicts(): RealtimeConflict[] {
  return Array.from(conflicts.values());
}

/**
 * Format sync status for display
 */
export function formatSyncStatus(): string {
  const statusIcon = {
    connected: '🟢',
    disconnected: '🔴',
    syncing: '🟡',
    error: '🔴',
  }[syncState.status];

  const subCount = syncState.subscriptions.size;
  const eventCount = syncState.eventHistory.length;
  const conflictCount = conflicts.size;

  let status = `${statusIcon} [${syncState.status}] ${subCount} subscriptions`;

  if (eventCount > 0) {
    status += ` • ${eventCount} events`;
  }

  if (conflictCount > 0) {
    status += ` ⚠️ ${conflictCount} conflicts`;
  }

  if (syncState.errorCount > 0) {
    status += ` 🔧 ${syncState.errorCount} errors`;
  }

  return status;
}

/**
 * Reset realtime sync state (testing)
 */
export function resetRealtimeSync(): void {
  syncState.status = 'disconnected';
  syncState.subscriptions.clear();
  syncState.eventHistory = [];
  syncState.errorCount = 0;
  syncState.lastError = undefined;
  subscriptionCounter = 0;
  conflicts.clear();
  eventHandlers.clear();
}
