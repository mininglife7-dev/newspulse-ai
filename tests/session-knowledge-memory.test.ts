import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryKnowledgeStore,
  getKnowledgeStore,
  resetKnowledgeStore,
  recordDiscovery,
  recordDecision,
} from '../lib/session-knowledge-memory';

describe('session-knowledge-memory (DNA-GOV-007)', () => {
  beforeEach(() => {
    resetKnowledgeStore();
  });

  describe('InMemoryKnowledgeStore', () => {
    it('stores and retrieves knowledge entries', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'vercel-hobby-tier-limit',
        value: { maxCrons: 1, currentCrons: 5 },
        description: 'Vercel Hobby tier limits to 1 daily cron',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'critical',
        status: 'active',
      });

      const retrieved = await store.retrieve('vercel-hobby-tier-limit');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.key).toBe('vercel-hobby-tier-limit');
      expect(retrieved?.value).toEqual({ maxCrons: 1, currentCrons: 5 });
    });

    it('returns null for non-existent keys', async () => {
      const store = new InMemoryKnowledgeStore();
      const result = await store.retrieve('non-existent');
      expect(result).toBeNull();
    });

    it('checks if knowledge exists', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'security',
        type: 'discovery',
        key: 'npm-vulnerabilities',
        value: { count: 10, critical: 1 },
        description: 'Found 10 npm vulnerabilities',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'high',
        status: 'active',
      });

      expect(await store.hasKnowledge('npm-vulnerabilities')).toBe(true);
      expect(await store.hasKnowledge('non-existent')).toBe(false);
    });

    it('retrieves entries by domain', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'key1',
        value: {},
        description: 'Operational discovery 1',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      await store.store({
        id: 'test-2',
        domain: 'operational',
        type: 'discovery',
        key: 'key2',
        value: {},
        description: 'Operational discovery 2',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      await store.store({
        id: 'test-3',
        domain: 'security',
        type: 'discovery',
        key: 'key3',
        value: {},
        description: 'Security discovery',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'high',
        status: 'active',
      });

      const operational = await store.retrieveByDomain('operational');
      const security = await store.retrieveByDomain('security');

      expect(operational).toHaveLength(2);
      expect(security).toHaveLength(1);
    });

    it('retrieves entries by type', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'discovery-key',
        value: {},
        description: 'A discovery',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      await store.store({
        id: 'test-2',
        domain: 'operational',
        type: 'decision',
        key: 'decision-key',
        value: {},
        description: 'A decision',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'high',
        status: 'active',
      });

      const discoveries = await store.retrieveByType('discovery');
      const decisions = await store.retrieveByType('decision');

      expect(discoveries).toHaveLength(1);
      expect(decisions).toHaveLength(1);
    });

    it('retrieves all keys', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'key1',
        value: {},
        description: 'Desc 1',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      await store.store({
        id: 'test-2',
        domain: 'operational',
        type: 'discovery',
        key: 'key2',
        value: {},
        description: 'Desc 2',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      const keys = await store.getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('searches by keyword', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'vercel-hobby-tier',
        value: {},
        description: 'Vercel Hobby tier limitation found',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'critical',
        status: 'active',
      });

      await store.store({
        id: 'test-2',
        domain: 'security',
        type: 'discovery',
        key: 'npm-vulnerabilities',
        value: {},
        description: 'npm audit found vulnerabilities',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'high',
        status: 'active',
      });

      const results = await store.searchByKeyword('vercel');
      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('vercel-hobby-tier');
    });

    it('deprecates knowledge entries', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'old-approach',
        value: { approach: 'manual' },
        description: 'Old approach to problem',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      await store.deprecate('old-approach', 'Replaced by automated solution');

      const deprecated = await store.retrieve('old-approach');
      expect(deprecated?.status).toBe('deprecated');
    });

    it('supersedes knowledge entries', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'decision',
        key: 'old-decision',
        value: { old: true },
        description: 'Old decision',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      await store.store({
        id: 'test-2',
        domain: 'operational',
        type: 'decision',
        key: 'new-decision',
        value: { new: true },
        description: 'New decision',
        discoveredAt: '2026-07-10T08:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      await store.supersede('old-decision', 'new-decision');

      const old = await store.retrieve('old-decision');
      const newEntry = await store.retrieve('new-decision');

      expect(old?.status).toBe('superseded');
      expect(newEntry?.status).toBe('active');
    });

    it('marks entries as active', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'test-key',
        value: {},
        description: 'Test',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'deprecated',
      });

      await store.markActive('test-key');

      const entry = await store.retrieve('test-key');
      expect(entry?.status).toBe('active');
    });

    it('records and retrieves session metrics', async () => {
      const store = new InMemoryKnowledgeStore();

      const metrics = {
        sessionId: 'session-1',
        sessionStartedAt: '2026-07-10T07:00:00Z',
        knowledgeEntriesCreated: 5,
        decisionsApplied: 3,
        discoveredProblems: 2,
        resolvedProblems: 1,
        dnasImplemented: 1,
        testsExecuted: 183,
      };

      await store.recordSessionMetrics(metrics);

      const retrieved = await store.getSessionMetrics('session-1');

      expect(retrieved).toEqual(metrics);
    });

    it('returns null for non-existent session metrics', async () => {
      const store = new InMemoryKnowledgeStore();
      const result = await store.getSessionMetrics('non-existent');
      expect(result).toBeNull();
    });

    it('exports all knowledge', async () => {
      const store = new InMemoryKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'key1',
        value: {},
        description: 'Entry 1',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      const exported = store.exportAll();
      expect(exported).toHaveLength(1);
      expect(exported[0].key).toBe('key1');
    });

    it('imports knowledge entries', async () => {
      const store1 = new InMemoryKnowledgeStore();
      const store2 = new InMemoryKnowledgeStore();

      await store1.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'key1',
        value: { data: 'value' },
        description: 'Entry 1',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      const exported = store1.exportAll();
      store2.importAll(exported);

      const imported = await store2.retrieve('key1');
      expect(imported?.value).toEqual({ data: 'value' });
    });
  });

  describe('getKnowledgeStore', () => {
    it('returns singleton instance', async () => {
      const store1 = getKnowledgeStore();
      const store2 = getKnowledgeStore();
      expect(store1).toBe(store2);
    });

    it('persists data across calls', async () => {
      const store = getKnowledgeStore();

      await store.store({
        id: 'test-1',
        domain: 'operational',
        type: 'discovery',
        key: 'persistent-key',
        value: { persistent: true },
        description: 'Test persistence',
        discoveredAt: '2026-07-10T07:00:00Z',
        sessionId: 'session-1',
        impact: 'medium',
        status: 'active',
      });

      const store2 = getKnowledgeStore();
      const retrieved = await store2.retrieve('persistent-key');

      expect(retrieved?.value).toEqual({ persistent: true });
    });
  });

  describe('helper functions', () => {
    it('recordDiscovery stores discoveries', async () => {
      const store = getKnowledgeStore();

      await recordDiscovery(
        'operational',
        'test-discovery',
        'Test discovery description',
        { test: true },
        'high'
      );

      const entry = await store.retrieve('test-discovery');
      expect(entry?.type).toBe('discovery');
      expect(entry?.impact).toBe('high');
    });

    it('recordDecision stores decisions', async () => {
      const store = getKnowledgeStore();

      await recordDecision(
        'operational',
        'test-decision',
        'Test decision description',
        { decided: true }
      );

      const entry = await store.retrieve('test-decision');
      expect(entry?.type).toBe('decision');
      expect(entry?.impact).toBe('high');
    });
  });
});
