import { NextResponse, NextRequest } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { resolveContext, contextError } from '@/lib/api-context';
import { uploadLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EvidenceItem {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by_name: string;
  uploaded_at: string;
  notes?: string;
}

/**
 * GET /api/evidence?obligation_id=X
 * Fetch all evidence attached to an obligation
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const obligationId = searchParams.get('obligation_id');

  if (!obligationId?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'obligation_id is required' },
      { status: 400 }
    );
  }

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  try {
    // Verify user has access to this obligation
    const { data: obligation } = await supabase
      .from('obligations')
      .select('id, workspace_id')
      .eq('id', obligationId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (!obligation) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found' },
        { status: 404 }
      );
    }

    // Fetch evidence
    const { data: evidence, error: evError } = await supabase.rpc(
      'get_obligation_evidence',
      { p_obligation_id: obligationId }
    );

    if (evError) {
      console.error('[api/evidence] fetch failed:', evError);
      return NextResponse.json(
        { ok: false, error: 'Failed to load evidence' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      evidence: (evidence as any[]) || [],
      count: ((evidence as any[]) || []).length,
    });
  } catch (err: any) {
    console.error('[api/evidence] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evidence
 * Upload evidence file for an obligation
 * Expects FormData with: obligation_id, file, notes (optional)
 */
export async function POST(req: Request) {
  // Rate limit file uploads (10 per hour per IP)
  const rateLimitResponse = await uploadLimiter(req as NextRequest);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  try {
    const formData = await req.formData();
    const obligationId = formData.get('obligation_id') as string;
    const file = formData.get('file') as File;
    const notes = (formData.get('notes') as string) || null;

    if (!obligationId?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'obligation_id is required' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'file is required' },
        { status: 400 }
      );
    }

    // Validate file size (10 MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, error: 'File size exceeds 10 MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }

    // Verify user has access to this obligation
    const { data: obligation } = await supabase
      .from('obligations')
      .select('id, workspace_id')
      .eq('id', obligationId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (!obligation) {
      return NextResponse.json(
        { ok: false, error: 'Obligation not found' },
        { status: 404 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `obligations/${obligationId}/${fileName}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('compliance-evidence')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[api/evidence] upload failed:', uploadError);
      return NextResponse.json(
        { ok: false, error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Record evidence in database
    const { data: evidence, error: dbError } = await supabase
      .from('obligation_evidence')
      .insert([
        {
          obligation_id: obligationId,
          workspace_id: ctx.workspaceId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          uploaded_by: ctx.userId,
          notes: notes,
        },
      ])
      .select()
      .maybeSingle();

    if (dbError) {
      console.error('[api/evidence] db insert failed:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from('compliance-evidence').remove([storagePath]);
      return NextResponse.json(
        { ok: false, error: 'Failed to save evidence record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      evidence: evidence,
    });
  } catch (err: any) {
    console.error('[api/evidence] POST failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload evidence' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/evidence?evidence_id=X
 * Delete an evidence record (uploader only)
 */
export async function DELETE(req: Request) {
  // Rate limit operations (60 per minute per IP)
  const rateLimitResponse = await uploadLimiter(req as NextRequest);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  const evidenceId = searchParams.get('evidence_id');

  if (!evidenceId?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'evidence_id is required' },
      { status: 400 }
    );
  }

  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return contextError(ctx);
  }

  try {
    // Verify ownership and get storage path
    const { data: evidence } = await supabase
      .from('obligation_evidence')
      .select('id, storage_path, uploaded_by, workspace_id')
      .eq('id', evidenceId)
      .eq('workspace_id', ctx.workspaceId)
      .maybeSingle();

    if (!evidence) {
      return NextResponse.json(
        { ok: false, error: 'Evidence not found' },
        { status: 404 }
      );
    }

    if (evidence.uploaded_by !== ctx.userId) {
      return NextResponse.json(
        { ok: false, error: 'You can only delete evidence you uploaded' },
        { status: 403 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('compliance-evidence')
      .remove([evidence.storage_path]);

    if (storageError) {
      console.error('[api/evidence] storage delete failed:', storageError);
      // Continue to delete from db anyway
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('obligation_evidence')
      .delete()
      .eq('id', evidenceId);

    if (dbError) {
      console.error('[api/evidence] db delete failed:', dbError);
      return NextResponse.json(
        { ok: false, error: 'Failed to delete evidence' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[api/evidence] DELETE failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }
}
