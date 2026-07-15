import { createRouteClient } from '@/lib/supabase-server';
import { discoverGcpAISystems } from '@/lib/integrations/gcp-discovery';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DiscoverGcpBody {
  projectId: string;
  credentials: Record<string, any>;
  regions?: string[];
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
    let body: DiscoverGcpBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input
    if (!body.projectId || !body.credentials) {
      return NextResponse.json(
        { error: 'projectId and credentials are required' },
        { status: 400 }
      );
    }

    // Discover GCP AI systems
    const detections = await discoverGcpAISystems({
      projectId: body.projectId,
      credentials: body.credentials,
      regions: body.regions,
    });

    // Store detections
    if (detections.length > 0) {
      const detectionsToStore = detections.map((detection) => ({
        workspace_id: workspaceId,
        ai_system_id: detection.id,
        detection_source: 'gcp',
        external_id: detection.id,
        name: detection.name,
        description: detection.description,
        url: detection.url,
        language: 'infrastructure',
        topics: ['gcp', 'ml', detection.serviceType],
        detected_patterns: detection.detectedPatterns,
        confidence: detection.confidence,
        metadata: {
          serviceType: detection.serviceType,
          region: detection.region,
          lastUpdated: detection.lastUpdated,
          projectId: body.projectId,
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
        provider: 'gcp',
        connection_name: `GCP (${body.projectId})`,
        config: {
          projectId: body.projectId,
          regions: body.regions,
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
        byServiceType: detections.reduce((acc, d) => {
          acc[d.serviceType] = (acc[d.serviceType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byRegion: detections.reduce((acc, d) => {
          acc[d.region] = (acc[d.region] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('GCP discovery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
