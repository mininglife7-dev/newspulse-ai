import { createRouteClient } from '@/lib/supabase-server';
import { discoverAzureAISystems } from '@/lib/integrations/azure-discovery';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DiscoverAzureBody {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
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
    let body: DiscoverAzureBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input
    if (!body.subscriptionId || !body.tenantId || !body.clientId || !body.clientSecret) {
      return NextResponse.json(
        { error: 'subscriptionId, tenantId, clientId, and clientSecret are required' },
        { status: 400 }
      );
    }

    // Discover Azure AI systems
    const detections = await discoverAzureAISystems({
      subscriptionId: body.subscriptionId,
      tenantId: body.tenantId,
      clientId: body.clientId,
      clientSecret: body.clientSecret,
    });

    // Store detections
    if (detections.length > 0) {
      const detectionsToStore = detections.map((detection) => ({
        workspace_id: workspaceId,
        ai_system_id: detection.id,
        detection_source: 'azure',
        external_id: detection.id,
        name: detection.name,
        description: detection.description,
        url: detection.url,
        language: 'infrastructure',
        topics: ['azure', 'ml', detection.resourceType.toLowerCase()],
        detected_patterns: detection.detectedPatterns,
        confidence: detection.confidence,
        metadata: {
          resourceType: detection.resourceType,
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
        provider: 'azure',
        connection_name: `Azure (${body.subscriptionId.slice(0, 8)}...)`,
        config: {
          subscriptionId: body.subscriptionId,
          tenantId: body.tenantId,
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
        byResourceType: detections.reduce((acc, d) => {
          acc[d.resourceType] = (acc[d.resourceType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byRegion: detections.reduce((acc, d) => {
          acc[d.region] = (acc[d.region] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Azure discovery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
