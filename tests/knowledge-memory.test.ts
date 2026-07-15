/**
 * DNA-GOV-007: Knowledge Memory — Test Suite
 *
 * Tests persistent storage and retrieval of organizational learnings.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  readKnowledge,
  writeKnowledge,
  queryKnowledgeByTag,
  queryKnowledgeByType,
  getKnowledgeSummary,
  getUnresolvedKnowledge,
  getHighImpactLearnings,
  knowledgeExists,
  KnowledgeEntry,
} from '@/lib/knowledge-memory';

describe('DNA-GOV-007: Knowledge Memory', () => {
  const TEST_FILE = 'docs/governance/KNOWLEDGE-MEMORY.test.jsonl';

  beforeEach(async () => {
    // Set environment variable to use test file
    process.env.KNOWLEDGE_MEMORY_FILE = TEST_FILE;

    // Clean up test file before each test
    try {
      await fs.unlink(TEST_FILE);
    } catch {
      // File doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test file after each test
    try {
      await fs.unlink(TEST_FILE);
    } catch {
      // File doesn't exist, that's fine
    }

    // Reset environment variable
    delete process.env.KNOWLEDGE_MEMORY_FILE;
  });

  test('should read empty knowledge when file does not exist', async () => {
    const entries = await readKnowledge();
    expect(entries).toEqual([]);
  });

  test('should write knowledge entry to persistent storage', async () => {
    const entry: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session-001',
      type: 'learning',
      title: 'RLS policies must be deployed manually',
      description: 'Supabase schema code includes RLS policies but they must be deployed to live project via SQL editor.',
      evidence: ['Schema deploy failed silently without policy deployment', 'First customer signup failed with 403'],
      impact: 'high',
      tags: ['auth', 'supabase', 'deployment'],
      resolved: false,
    };

    await writeKnowledge(entry);
    const entries = await readKnowledge();

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('RLS policies must be deployed manually');
  });

  test('should preserve multiple knowledge entries in order', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: '2026-07-10T10:00:00Z',
      sessionId: 'session-1',
      type: 'learning',
      title: 'First learning',
      description: 'First discovery',
      evidence: ['evidence 1'],
      impact: 'high',
      tags: ['auth'],
    };

    const entry2: KnowledgeEntry = {
      timestamp: '2026-07-10T11:00:00Z',
      sessionId: 'session-2',
      type: 'fix',
      title: 'Second fix',
      description: 'Second fix applied',
      evidence: ['evidence 2'],
      impact: 'medium',
      tags: ['performance'],
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);

    const entries = await readKnowledge();
    expect(entries).toHaveLength(2);
    expect(entries[0].title).toBe('First learning');
    expect(entries[1].title).toBe('Second fix');
  });

  test('should query knowledge by tag', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'learning',
      title: 'Auth issue',
      description: 'Auth issue found',
      evidence: [],
      impact: 'high',
      tags: ['auth', 'security'],
    };

    const entry2: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'learning',
      title: 'Performance issue',
      description: 'Performance degradation',
      evidence: [],
      impact: 'medium',
      tags: ['performance'],
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);

    const authLearnings = await queryKnowledgeByTag('auth');
    expect(authLearnings).toHaveLength(1);
    expect(authLearnings[0].title).toBe('Auth issue');

    const securityLearnings = await queryKnowledgeByTag('security');
    expect(securityLearnings).toHaveLength(1);

    const perfLearnings = await queryKnowledgeByTag('performance');
    expect(perfLearnings).toHaveLength(1);
  });

  test('should query knowledge by type', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'decision',
      title: 'Decided to use Supabase',
      description: 'Chose Supabase for auth',
      evidence: [],
      impact: 'high',
      tags: ['architecture'],
    };

    const entry2: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'fix',
      title: 'Fixed RLS policy',
      description: 'Applied missing RLS policy',
      evidence: [],
      impact: 'high',
      tags: ['auth'],
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);

    const decisions = await queryKnowledgeByType('decision');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].title).toBe('Decided to use Supabase');

    const fixes = await queryKnowledgeByType('fix');
    expect(fixes).toHaveLength(1);
    expect(fixes[0].title).toBe('Fixed RLS policy');
  });

  test('should generate knowledge summary with tag counts', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: '2026-07-10T10:00:00Z',
      sessionId: 'session-1',
      type: 'learning',
      title: 'Learning 1',
      description: 'Description 1',
      evidence: [],
      impact: 'high',
      tags: ['auth', 'security'],
    };

    const entry2: KnowledgeEntry = {
      timestamp: '2026-07-10T11:00:00Z',
      sessionId: 'session-2',
      type: 'learning',
      title: 'Learning 2',
      description: 'Description 2',
      evidence: [],
      impact: 'high',
      tags: ['auth'],
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);

    const summary = await getKnowledgeSummary();

    expect(summary.entries).toHaveLength(2);
    expect(summary.sessionsSeen).toBe(2);
    expect(summary.entriesByTag.auth).toBe(2);
    expect(summary.entriesByTag.security).toBe(1);
  });

  test('should filter unresolved knowledge', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'risk',
      title: 'GitHub Actions can fail silently',
      description: 'Actions outages were undetected for 4+ hours',
      evidence: [],
      impact: 'high',
      tags: ['ci-cd'],
      resolved: false,
    };

    const entry2: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'fix',
      title: 'Implemented blocking condition detector',
      description: 'DNA-GOV-001 now monitors GitHub Actions',
      evidence: [],
      impact: 'high',
      tags: ['ci-cd'],
      resolved: true,
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);

    const unresolved = await getUnresolvedKnowledge();
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].title).toBe('GitHub Actions can fail silently');
  });

  test('should filter unresolved knowledge by tag', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'risk',
      title: 'Auth issue unresolved',
      description: 'Unresolved auth issue',
      evidence: [],
      impact: 'high',
      tags: ['auth'],
      resolved: false,
    };

    const entry2: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'risk',
      title: 'Perf issue unresolved',
      description: 'Unresolved perf issue',
      evidence: [],
      impact: 'high',
      tags: ['performance'],
      resolved: false,
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);

    const unresolvedAuth = await getUnresolvedKnowledge('auth');
    expect(unresolvedAuth).toHaveLength(1);
    expect(unresolvedAuth[0].tags).toContain('auth');
  });

  test('should return high-impact learnings sorted by recency', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: '2026-07-10T10:00:00Z',
      sessionId: 'session-1',
      type: 'learning',
      title: 'Old high-impact',
      description: 'Old learning',
      evidence: [],
      impact: 'high',
      tags: ['auth'],
      resolved: false,
    };

    const entry2: KnowledgeEntry = {
      timestamp: '2026-07-10T12:00:00Z',
      sessionId: 'session-2',
      type: 'learning',
      title: 'Recent high-impact',
      description: 'Recent learning',
      evidence: [],
      impact: 'high',
      tags: ['auth'],
      resolved: false,
    };

    const entry3: KnowledgeEntry = {
      timestamp: '2026-07-10T11:00:00Z',
      sessionId: 'session-2',
      type: 'learning',
      title: 'Low-impact',
      description: 'Low impact learning',
      evidence: [],
      impact: 'low',
      tags: ['auth'],
      resolved: false,
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);
    await writeKnowledge(entry3);

    const highImpact = await getHighImpactLearnings();
    expect(highImpact).toHaveLength(2);
    expect(highImpact[0].title).toBe('Recent high-impact'); // Most recent first
    expect(highImpact[1].title).toBe('Old high-impact');
  });

  test('should not include resolved high-impact learnings', async () => {
    const entry1: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'learning',
      title: 'Resolved high-impact',
      description: 'This was fixed',
      evidence: [],
      impact: 'high',
      tags: ['auth'],
      resolved: true,
    };

    const entry2: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'learning',
      title: 'Unresolved high-impact',
      description: 'This still needs work',
      evidence: [],
      impact: 'high',
      tags: ['auth'],
      resolved: false,
    };

    await writeKnowledge(entry1);
    await writeKnowledge(entry2);

    const highImpact = await getHighImpactLearnings();
    expect(highImpact).toHaveLength(1);
    expect(highImpact[0].title).toBe('Unresolved high-impact');
  });

  test('should check if knowledge already exists', async () => {
    const entry: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'learning',
      title: 'Duplicate test',
      description: 'Check for duplicates',
      evidence: [],
      impact: 'high',
      tags: ['test'],
    };

    await writeKnowledge(entry);

    const exists = await knowledgeExists('Duplicate test');
    expect(exists).not.toBeNull();
    expect(exists?.title).toBe('Duplicate test');

    const notExists = await knowledgeExists('Non-existent knowledge');
    expect(notExists).toBeNull();
  });

  test('should handle empty tags array', async () => {
    const entry: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'decision',
      title: 'No tags decision',
      description: 'Decision with no tags',
      evidence: [],
      impact: 'low',
      tags: [],
    };

    await writeKnowledge(entry);
    const entries = await readKnowledge();

    expect(entries).toHaveLength(1);
    expect(entries[0].tags).toEqual([]);
  });

  test('should handle empty evidence array', async () => {
    const entry: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: 'test-session',
      type: 'learning',
      title: 'No evidence claim',
      description: 'Learning with no evidence',
      evidence: [],
      impact: 'low',
      tags: ['test'],
    };

    await writeKnowledge(entry);
    const entries = await readKnowledge();

    expect(entries).toHaveLength(1);
    expect(entries[0].evidence).toEqual([]);
  });
});
