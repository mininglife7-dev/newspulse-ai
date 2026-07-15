import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { discoverGitHubAISystems, GitHubDiscoveryConfig } from '@/lib/integrations/github-discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DiscoverGitHubBody {
  org?: string;
  username?: string;
  githubToken: string;
  includePrivate?: boolean;
}

/**
 * Resolve the caller's active workspace
 */
async function resolveContext(supabase: Awaited<ReturnType<typeof createRouteClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 401 as const, error: 'Authentication required' };

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      status: 409 as const,
      error: 'No workspace yet — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/** POST /api/integrations/github/discover — discover AI systems from GitHub org/user */
export async function POST(req: Request) {
  let body: DiscoverGitHubBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Validate inputs
  if (!body.githubToken || (!body.org && !body.username)) {
    return NextResponse.json(
      { ok: false, error: 'githubToken and either org or username is required' },
      { status: 400 }
    );
  }

  const supabase = await createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    // Discover GitHub repositories
    const config: GitHubDiscoveryConfig = {
      token: body.githubToken,
      org: body.org,
      username: body.username,
      includePrivate: body.includePrivate ?? false,
    };

    const discoveries = await discoverGitHubAISystems(config);

    if (!discoveries.length) {
      return NextResponse.json({
        ok: true,
        message: 'No AI systems detected',
        systems: [],
      });
    }

    // Store detections in database
    const detections = discoveries.map((d) => ({
      workspace_id: ctx.workspaceId,
      detection_source: 'github',
      external_id: d.id, // GitHub repo ID
      name: d.name,
      description: d.description || null,
      url: d.url,
      language: d.language,
      topics: d.topics,
      detected_patterns: d.detectedPatterns,
      confidence: d.confidence,
      metadata: {
        raw: d,
      },
      status: 'detected',
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('ai_system_detections')
      .upsert(detections, {
        onConflict: 'workspace_id,detection_source,external_id',
      })
      .select();

    if (insertError) {
      console.error('[api/github/discover] insert failed:', insertError);
      return NextResponse.json(
        { ok: false, error: 'Could not save detections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Detected ${inserted?.length || 0} AI systems`,
      systems: inserted || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/github/discover] error:', message);
    return NextResponse.json(
      { ok: false, error: `Discovery failed: ${message}` },
      { status: 500 }
    );
  }
}
