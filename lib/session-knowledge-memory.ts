/**
 * DNA-GOV-007: Session Knowledge Memory
 *
 * Persistent organizational memory across Governor sessions.
 * Prevents redundant discovery and enables exponential learning.
 *
 * Storage: Supabase table (persistent across sessions)
 * Access: Key-value lookup + append-only decision log
 */

export type KnowledgeDomain =
  | 'architecture'
  | 'security'
  | 'performance'
  | 'reliability'
  | 'operational'
  | 'business';
export type DecisionType =
  'discovery' | 'decision' | 'action' | 'outcome' | 'metric';

export interface KnowledgeEntry {
  id: string;
  domain: KnowledgeDomain;
  type: DecisionType;
  key: string; // e.g., "vercel-hobby-tier-limit", "github-actions-outage-detection"
  value: unknown; // Domain-specific value (can be string, object, array, etc.)
  description: string; // Human-readable summary
  discoveredAt: string; // ISO timestamp
  sessionId: string; // Governor session ID
  impact: 'critical' | 'high' | 'medium' | 'low'; // Estimated impact
  status: 'active' | 'superseded' | 'deprecated'; // Active in current logic?
  relatedKeys?: string[]; // Cross-references to other knowledge
}

export interface SessionMetrics {
  sessionId: string;
  sessionStartedAt: string;
  knowledgeEntriesCreated: number;
  decisionsApplied: number;
  discoveredProblems: number;
  resolvedProblems: number;
  dnasImplemented: number;
  testsExecuted: number;
}

export interface KnowledgeMemoryStore {
  // Store/retrieve knowledge
  store(entry: KnowledgeEntry): Promise<void>;
  retrieve(key: string): Promise<KnowledgeEntry | null>;
  retrieveByDomain(domain: KnowledgeDomain): Promise<KnowledgeEntry[]>;
  retrieveByType(type: DecisionType): Promise<KnowledgeEntry[]>;

  // Query operations
  hasKnowledge(key: string): Promise<boolean>;
  getAllKeys(): Promise<string[]>;
  searchByKeyword(keyword: string): Promise<KnowledgeEntry[]>;

  // Lifecycle management
  deprecate(key: string, reason: string): Promise<void>;
  supersede(oldKey: string, newKey: string): Promise<void>;
  markActive(key: string): Promise<void>;

  // Session metrics
  recordSessionMetrics(metrics: SessionMetrics): Promise<void>;
  getSessionMetrics(sessionId: string): Promise<SessionMetrics | null>;
}

/**
 * In-memory implementation for MVP (no persistence yet).
 * Future: Wire to Supabase for cross-session persistence.
 */
export class InMemoryKnowledgeStore implements KnowledgeMemoryStore {
  private _entries: Map<string, KnowledgeEntry> = new Map();
  private _sessionMetrics: Map<string, SessionMetrics> = new Map();

  async store(entry: KnowledgeEntry): Promise<void> {
    // Mark previous version as superseded
    const existing = this._entries.get(entry.key);
    if (existing && existing.status === 'active') {
      existing.status = 'superseded';
    }
    this._entries.set(entry.key, entry);
  }

  async retrieve(key: string): Promise<KnowledgeEntry | null> {
    return this._entries.get(key) || null;
  }

  async retrieveByDomain(domain: KnowledgeDomain): Promise<KnowledgeEntry[]> {
    return Array.from(this._entries.values()).filter(
      (e) => e.domain === domain
    );
  }

  async retrieveByType(type: DecisionType): Promise<KnowledgeEntry[]> {
    return Array.from(this._entries.values()).filter((e) => e.type === type);
  }

  async hasKnowledge(key: string): Promise<boolean> {
    return this._entries.has(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this._entries.keys());
  }

  async searchByKeyword(keyword: string): Promise<KnowledgeEntry[]> {
    const lower = keyword.toLowerCase();
    return Array.from(this._entries.values()).filter(
      (e) =>
        e.key.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower)
    );
  }

  async deprecate(key: string, reason: string): Promise<void> {
    const entry = this._entries.get(key);
    if (entry) {
      entry.status = 'deprecated';
      entry.value = { deprecated: true, reason };
    }
  }

  async supersede(oldKey: string, newKey: string): Promise<void> {
    const oldEntry = this._entries.get(oldKey);
    if (oldEntry) {
      oldEntry.status = 'superseded';
    }
    // New key should already be stored
  }

  async markActive(key: string): Promise<void> {
    const entry = this._entries.get(key);
    if (entry) {
      entry.status = 'active';
    }
  }

  async recordSessionMetrics(metrics: SessionMetrics): Promise<void> {
    this._sessionMetrics.set(metrics.sessionId, metrics);
  }

  async getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
    return this._sessionMetrics.get(sessionId) || null;
  }

  // Utility: Export all knowledge for external storage
  exportAll(): KnowledgeEntry[] {
    return Array.from(this._entries.values());
  }

  // Utility: Import knowledge from external storage
  importAll(entries: KnowledgeEntry[]): void {
    entries.forEach((e) => this._entries.set(e.key, e));
  }
}

// Global singleton instance (should be per-session in production)
let globalMemory: KnowledgeMemoryStore | null = null;

export function getKnowledgeStore(): KnowledgeMemoryStore {
  if (!globalMemory) {
    globalMemory = new InMemoryKnowledgeStore();
  }
  return globalMemory;
}

export function resetKnowledgeStore(): void {
  globalMemory = new InMemoryKnowledgeStore();
}

/**
 * Helper: Record a discovery in knowledge memory.
 */
export async function recordDiscovery(
  domain: KnowledgeDomain,
  key: string,
  description: string,
  value: unknown,
  impact: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  const store = getKnowledgeStore();
  await store.store({
    id: `${key}-${Date.now()}`,
    domain,
    type: 'discovery',
    key,
    value,
    description,
    discoveredAt: new Date().toISOString(),
    sessionId: process.env.GOVERNOR_SESSION_ID || 'unknown',
    impact,
    status: 'active',
  });
}

/**
 * Helper: Record a decision in knowledge memory.
 */
export async function recordDecision(
  domain: KnowledgeDomain,
  key: string,
  description: string,
  value: unknown
): Promise<void> {
  const store = getKnowledgeStore();
  await store.store({
    id: `${key}-${Date.now()}`,
    domain,
    type: 'decision',
    key,
    value,
    description,
    discoveredAt: new Date().toISOString(),
    sessionId: process.env.GOVERNOR_SESSION_ID || 'unknown',
    impact: 'high',
    status: 'active',
  });
}
