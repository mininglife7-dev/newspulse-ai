import { createRouteClient } from '@/lib/supabase-server';
import { generateAiBomFromDependencies, AiBom } from '@/lib/integrations/ai-bom-generator';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateAiBomRequest {
  systemId: string;
  systemName: string;
  files: Array<{
    path: string;
    content: string;
  }>;
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
    let body: GenerateAiBomRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate input
    if (!body.systemId || !body.systemName || !body.files || !Array.isArray(body.files)) {
      return NextResponse.json(
        {
          error: 'systemId, systemName, and files array are required',
        },
        { status: 400 }
      );
    }

    if (body.files.length === 0) {
      return NextResponse.json(
        { error: 'files array must not be empty' },
        { status: 400 }
      );
    }

    // Validate file structure
    const validationErrors: string[] = [];
    body.files.forEach((file, idx) => {
      if (!file.path) {
        validationErrors.push(`File ${idx}: path is required`);
      }
      if (!file.content) {
        validationErrors.push(`File ${idx}: content is required`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'File validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Generate AI-BOM from dependencies
    const aiBom = await generateAiBomFromDependencies(body.systemId, body.files);

    // Store AI-BOM in database
    const { error: storageError } = await supabase.from('ai_bom_records').upsert({
      workspace_id: workspaceId,
      system_id: body.systemId,
      system_name: body.systemName,
      bom_data: aiBom,
      component_count: aiBom.components.length,
      critical_risk_count: aiBom.summary.criticalRiskCount,
      requires_ai_act_assessment: aiBom.summary.requiresAiActAssessment,
      generated_at: aiBom.generatedAt,
      created_at: new Date().toISOString(),
    });

    if (storageError) {
      console.error('Failed to store AI-BOM:', storageError);
    }

    return NextResponse.json({
      bom: aiBom,
      summary: {
        systemId: body.systemId,
        systemName: body.systemName,
        totalComponents: aiBom.components.length,
        frameworkComponents: aiBom.summary.frameworkComponents,
        criticalRiskCount: aiBom.summary.criticalRiskCount,
        requiresAiActAssessment: aiBom.summary.requiresAiActAssessment,
        findings: aiBom.findings,
      },
      compliance: {
        euAiAct: {
          applicability: aiBom.summary.requiresAiActAssessment,
          article11: 'AI Bill of Materials (AI-BOM) auto-generated per Article 11',
          requiredDocumentation: [
            'Training data source documentation',
            'Model capability assessment',
            'Risk classification',
            'Usage limitations',
            'Performance metrics',
          ],
          readinessStatus: 'partial - AI-BOM generated, assessment pending',
        },
      },
    });
  } catch (error) {
    console.error('AI-BOM generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-bom/generate?systemId=...
 * Retrieve previously generated AI-BOM
 */
export async function GET(request: NextRequest) {
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

    // Get systemId from query params
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');

    if (!systemId) {
      return NextResponse.json({ error: 'systemId query parameter is required' }, { status: 400 });
    }

    // Fetch AI-BOM record
    const { data: bomRecord, error: fetchError } = await supabase
      .from('ai_bom_records')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('system_id', systemId)
      .single();

    if (fetchError || !bomRecord) {
      return NextResponse.json(
        { error: 'AI-BOM not found for this system' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      bom: bomRecord.bom_data,
      metadata: {
        systemId: bomRecord.system_id,
        systemName: bomRecord.system_name,
        generatedAt: bomRecord.generated_at,
        componentCount: bomRecord.component_count,
        criticalRiskCount: bomRecord.critical_risk_count,
      },
    });
  } catch (error) {
    console.error('AI-BOM retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
