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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[knowledge] GET failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to query knowledge',
        message,
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

    // Validate required fields
    const { type, title, description, evidence, impact, tags } = body;

    if (!type || !title || !description || !evidence || !impact || !tags) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields',
          required: ['type', 'title', 'description', 'evidence', 'impact', 'tags'],
        },
        { status: 400 }
      );
    }

    // Validate field types
    if (!['decision', 'learning', 'pattern', 'fix', 'risk'].includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid type',
          allowed: ['decision', 'learning', 'pattern', 'fix', 'risk'],
        },
        { status: 400 }
      );
    }

    if (!['high', 'medium', 'low'].includes(impact)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid impact',
          allowed: ['high', 'medium', 'low'],
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(evidence) || !Array.isArray(tags)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'evidence and tags must be arrays',
        },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = await knowledgeExists(title);
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
      type: type as KnowledgeEntry['type'],
      title,
      description,
      evidence,
      impact: impact as 'high' | 'medium' | 'low',
      tags,
      relatedDNA: body.relatedDNA,
      resolved: body.resolved ?? false,
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[knowledge] POST failed:', message);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to write knowledge',
        message,
      },
      { status: 500 }
    );
  }
}
