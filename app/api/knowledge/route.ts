import { NextResponse } from 'next/server';
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
import { logger } from '@/lib/logger';
import { validators, validate } from '@/lib/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/knowledge
 *
 * DNA-GOV-007 endpoint: Query organizational knowledge.
 *
 * Query parameters:
 * - ?type=decision|learning|pattern|fix|risk — Filter by type
 * - ?tag=auth — Filter by tag
 * - ?unresolved=true — Only unresolved issues
 * - ?highImpact=true — Only high-impact unresolved learnings
 * - ?summary=true — Get summary stats
 *
 * Returns: Array of knowledge entries matching the query.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') as KnowledgeEntry['type'] | null;
  const tag = url.searchParams.get('tag');
  const unresolved = url.searchParams.get('unresolved') === 'true';
  const highImpact = url.searchParams.get('highImpact') === 'true';
  const summary = url.searchParams.get('summary') === 'true';

  try {
    // If summary requested, return aggregate stats
    if (summary) {
      const summaryData = await getKnowledgeSummary();
      return NextResponse.json({
        ok: true,
        summary: summaryData,
        checkedAt: new Date().toISOString(),
      });
    }

    // If high-impact learnings requested, return those
    if (highImpact) {
      const learnings = await getHighImpactLearnings();
      return NextResponse.json({
        ok: true,
        entries: learnings,
        count: learnings.length,
        checkedAt: new Date().toISOString(),
      });
    }

    // Apply filters
    let entries: KnowledgeEntry[] = [];

    if (type && tag) {
      // Both type and tag: get unresolved of that type with that tag
      const typeEntries = await queryKnowledgeByType(type);
      const tagEntries = await queryKnowledgeByTag(tag);
      const typeSet = new Set(typeEntries.map((e) => JSON.stringify(e)));
      entries = tagEntries.filter((e) => typeSet.has(JSON.stringify(e)));
    } else if (type) {
      entries = await queryKnowledgeByType(type);
    } else if (tag) {
      entries = await queryKnowledgeByTag(tag);
    } else if (unresolved) {
      entries = await getUnresolvedKnowledge();
    } else {
      entries = await readKnowledge();
    }

    // Filter by resolved status if requested
    if (unresolved) {
      entries = entries.filter((e) => !e.resolved);
    }

    return NextResponse.json({
      ok: true,
      entries,
      count: entries.length,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Knowledge query failed', 'KNOWLEDGE_QUERY_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to query knowledge',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge
 *
 * Write a new knowledge entry to persistent storage.
 *
 * Required body fields:
 * - type: 'decision' | 'learning' | 'pattern' | 'fix' | 'risk'
 * - title: Brief summary
 * - description: Full context
 * - evidence: String[] — Proof this knowledge is valid
 * - impact: 'high' | 'medium' | 'low'
 * - tags: String[] — Category tags
 *
 * Optional:
 * - relatedDNA: String — If this informed a DNA implementation
 * - resolved: Boolean — Whether this issue is closed
 *
 * Returns: The created entry.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input using schema
    const validationResult = validate(body, {
      type: validators.enum(['decision', 'learning', 'pattern', 'fix', 'risk'] as const),
      title: validators.string({ minLength: 1, maxLength: 255 }),
      description: validators.string({ minLength: 1, maxLength: 5000 }),
      evidence: validators.array(validators.string({ maxLength: 2000 }), { minLength: 1 }),
      impact: validators.enum(['high', 'medium', 'low'] as const),
      tags: validators.array(validators.string({ minLength: 1, maxLength: 100 }), { minLength: 1 }),
      relatedDNA: validators.optional(validators.string({ maxLength: 255 })),
      resolved: validators.optional(validators.boolean()),
    });

    if (!validationResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid input',
          errors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    const validated = validationResult.value as Record<string, unknown>;

    // Check for duplicates
    const existing = await knowledgeExists(validated.title as string);
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Knowledge with this title already exists',
          existingEntry: existing,
        },
        { status: 409 }
      );
    }

    // Create entry
    const entry: KnowledgeEntry = {
      timestamp: new Date().toISOString(),
      sessionId: req.headers.get('x-session-id') ?? 'unknown-session',
      type: validated.type as KnowledgeEntry['type'],
      title: validated.title as string,
      description: validated.description as string,
      evidence: validated.evidence as string[],
      impact: validated.impact as 'high' | 'medium' | 'low',
      tags: validated.tags as string[],
      relatedDNA: validated.relatedDNA as string | undefined,
      resolved: (validated.resolved as boolean | undefined) ?? false,
    };

    // Write to persistent storage
    await writeKnowledge(entry);

    return NextResponse.json(
      {
        ok: true,
        entry,
        savedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Knowledge write failed', 'KNOWLEDGE_WRITE_ERROR', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to write knowledge',
      },
      { status: 500 }
    );
  }
}
