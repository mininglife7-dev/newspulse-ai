/**
 * DNA-GOV-007: Knowledge Memory
 *
 * Persistent organizational learning system.
 * Every Governor session stores decisions, learnings, and discoveries.
 * Future sessions read this knowledge to avoid repeating analysis.
 *
 * Storage: docs/governance/KNOWLEDGE-MEMORY.jsonl (append-only log)
 * Format: One JSON object per line (JSONL for streaming append)
 *
 * Examples of knowledge:
 * - "Discovered: POST /api/workspace fails silently if RLS policies missing"
 * - "Fixed: GitHub Actions rate limit blocks CI (monitor billing monthly)"
 * - "Pattern: Supabase schema changes need manual deployment + verification"
 * - "Insight: Email signup tests must mock SMTP (can't test real emails in prod)"
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface KnowledgeEntry {
  timestamp: string; // ISO 8601
  sessionId: string; // Governor session identifier
  type: 'decision' | 'learning' | 'pattern' | 'fix' | 'risk';
  title: string; // Brief summary
  description: string; // Full context
  evidence: string[]; // Proof this knowledge is valid
  impact: 'high' | 'medium' | 'low'; // How important this knowledge is
  relatedDNA?: string; // If this learning informed a DNA (e.g., "DNA-GOV-001")
  tags: string[]; // Category tags (e.g., ["auth", "performance", "security"])
  resolved?: boolean; // Whether this is a closed issue or ongoing pattern
}

export interface KnowledgeMemory {
  entries: KnowledgeEntry[];
  lastUpdated: string;
  sessionsSeen: number;
  entriesByTag: Record<string, number>;
}

/**
 * Get the knowledge file path (supports environment override for testing).
 */
function getKnowledgeFile(): string {
  return (
    process.env.KNOWLEDGE_MEMORY_FILE ||
    'docs/governance/KNOWLEDGE-MEMORY.jsonl'
  );
}

/**
 * Read all knowledge entries from persistent storage.
 */
export async function readKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    const knowledgeFile = getKnowledgeFile();
    const content = await fs.readFile(knowledgeFile, 'utf-8');
    if (!content.trim()) return [];
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as KnowledgeEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // File doesn't exist yet
    }
    throw error;
  }
}

/**
 * Write a new knowledge entry to persistent storage.
 */
export async function writeKnowledge(entry: KnowledgeEntry): Promise<void> {
  const knowledgeFile = getKnowledgeFile();
  // Ensure directory exists
  const dir = path.dirname(knowledgeFile);
  await fs.mkdir(dir, { recursive: true });

  // Append entry as JSON line
  await fs.appendFile(knowledgeFile, JSON.stringify(entry) + '\n', 'utf-8');
}

/**
 * Query knowledge by tag (e.g., "auth", "performance").
 */
export async function queryKnowledgeByTag(
  tag: string
): Promise<KnowledgeEntry[]> {
  const entries = await readKnowledge();
  return entries.filter((e) => e.tags.includes(tag));
}

/**
 * Query knowledge by type (decision/learning/pattern/fix/risk).
 */
export async function queryKnowledgeByType(
  type: KnowledgeEntry['type']
): Promise<KnowledgeEntry[]> {
  const entries = await readKnowledge();
  return entries.filter((e) => e.type === type);
}

/**
 * Get a summary of all knowledge (for Founder briefing).
 */
export async function getKnowledgeSummary(): Promise<KnowledgeMemory> {
  const entries = await readKnowledge();

  // Count by tag
  const entriesByTag: Record<string, number> = {};
  entries.forEach((entry) => {
    entry.tags.forEach((tag) => {
      entriesByTag[tag] = (entriesByTag[tag] ?? 0) + 1;
    });
  });

  // Count unique sessions
  const sessionIds = new Set(entries.map((e) => e.sessionId));

  return {
    entries,
    lastUpdated:
      entries[entries.length - 1]?.timestamp ?? new Date().toISOString(),
    sessionsSeen: sessionIds.size,
    entriesByTag,
  };
}

/**
 * Find unresolved issues/learnings related to a specific area.
 * Used to identify what still needs investigation or fixing.
 */
export async function getUnresolvedKnowledge(
  tag?: string
): Promise<KnowledgeEntry[]> {
  let entries = await readKnowledge();

  if (tag) {
    entries = entries.filter((e) => e.tags.includes(tag));
  }

  return entries.filter((e) => !e.resolved);
}

/**
 * Get high-impact learnings that Governor should know about on startup.
 */
export async function getHighImpactLearnings(): Promise<KnowledgeEntry[]> {
  const entries = await readKnowledge();
  return entries
    .filter((e) => e.impact === 'high' && !e.resolved)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 10); // Top 10 recent high-impact learnings
}

/**
 * Check if a specific knowledge pattern already exists (prevents duplicates).
 */
export async function knowledgeExists(
  title: string
): Promise<KnowledgeEntry | null> {
  const entries = await readKnowledge();
  return entries.find((e) => e.title === title) ?? null;
}
