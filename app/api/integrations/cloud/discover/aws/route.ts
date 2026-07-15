import { createRouteClient } from '@/lib/supabase-server';
import { discoverAwsAISystems } from '@/lib/integrations/aws-discovery';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DiscoverAwsBody {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  includeAllRegions?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace context
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: 'No active workspace — complete company setup first' },
        { status: 409 }
      );
    }

    const workspaceId = membership.workspace_id as string;

    // Parse request body
    let body: DiscoverAwsBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input
    if (!body.accessKeyId || !body.secretAccessKey) {
      return NextResponse.json(
        { error: 'accessKeyId and secretAccessKey are required' },
        { status: 400 }
      );
    }

    // Discover AWS AI systems
    const detections = await discoverAwsAISystems({
      accessKeyId: body.accessKeyId,
      secretAccessKey: body.secretAccessKey,
      region: body.region,
      includeAllRegions: body.includeAllRegions,
    });

    // Store detections
    if (detections.length > 0) {
      const detectionsToStore = detections.map((detection) => ({
        workspace_id: workspaceId,
        ai_system_id: detection.id,
        detection_source: 'aws',
        external_id: detection.id,
        name: detection.name,
        description: detection.description,
        url: detection.url,
        language: 'infrastructure',
        topics: ['aws', 'ml', detection.service],
        detected_patterns: detection.detectedPatterns,
        confidence: detection.confidence,
        metadata: {
          service: detection.service,
          region: detection.region,
          lastUpdated: detection.lastUpdated,
          ...detection.metadata,
        },
        status: 'detected',
      }));

      await supabase.from('ai_system_detections').upsert(detectionsToStore, {
        onConflict: 'workspace_id,external_id,detection_source',
      });
    }

    // Store connection for future scans
    await supabase.from('discovery_connections').upsert(
      {
        workspace_id: workspaceId,
        provider: 'aws',
        connection_name: `AWS (${body.region || 'all-regions'})`,
        config: {
          region: body.region,
          includeAllRegions: body.includeAllRegions,
        },
        status: 'connected',
        last_tested_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      },
      {
        onConflict: 'workspace_id,provider,connection_name',
      }
    );

    return NextResponse.json({
      detections,
      summary: {
        totalDetected: detections.length,
        byService: detections.reduce((acc, d) => {
          acc[d.service] = (acc[d.service] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byRegion: detections.reduce((acc, d) => {
          acc[d.region] = (acc[d.region] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('AWS discovery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
