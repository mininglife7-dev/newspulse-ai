import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BulkUpdateRow {
  obligation_id: string;
  status?: string;
  priority?: string;
  notes?: string;
}

interface BulkImportResult {
  total_rows: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; obligation_id: string; error: string }>;
}

function parseCSV(csvContent: string): BulkUpdateRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 1) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const obligationIdIndex = headers.indexOf('obligation_id');

  if (obligationIdIndex === -1) {
    throw new Error('CSV must contain obligation_id column');
  }

  const statusIndex = headers.indexOf('status');
  const priorityIndex = headers.indexOf('priority');

  // Parse rows
  const rows: BulkUpdateRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = line.split(',').map((p) => p.trim());
    const row: BulkUpdateRow = {
      obligation_id: parts[obligationIdIndex] || '',
      status: statusIndex >= 0 ? parts[statusIndex] : undefined,
      priority: priorityIndex >= 0 ? parts[priorityIndex] : undefined,
    };

    rows.push(row);
  }

  return rows;
}

async function resolveContext(supabase: ReturnType<typeof createRouteClient>) {
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
      error: 'No workspace — complete company setup first',
    };
  }

  return {
    status: 200 as const,
    workspaceId: membership.workspace_id as string,
  };
}

/**
 * POST /api/obligations/bulk-import — bulk update obligations from CSV
 * CSV format: obligation_id, status, priority, notes
 */
export async function POST(req: Request) {
  const supabase = createRouteClient();
  const ctx = await resolveContext(supabase);
  if (ctx.status !== 200) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'CSV file required' },
        { status: 400 }
      );
    }

    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { ok: false, error: 'File must be CSV format' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'File must be less than 10 MB' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    let rows: BulkUpdateRow[];

    try {
      rows = parseCSV(csvContent);
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `Invalid CSV format. ${(err as any)?.message || 'Ensure first row contains headers.'}` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    if (rows.length > 10000) {
      return NextResponse.json(
        { ok: false, error: 'CSV exceeds maximum of 10,000 rows' },
        { status: 400 }
      );
    }

    const result: BulkImportResult = {
      total_rows: rows.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each row
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowNum = idx + 2; // Account for header row

      if (!row.obligation_id?.trim()) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          obligation_id: '',
          error: 'obligation_id is required',
        });
        continue;
      }

      // Validate status if provided
      const validStatuses = ['identified', 'in_progress', 'completed', 'not_applicable'];
      if (row.status && !validStatuses.includes(row.status)) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          obligation_id: row.obligation_id,
          error: `Invalid status "${row.status}". Must be one of: ${validStatuses.join(', ')}`,
        });
        continue;
      }

      // Validate priority if provided
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (row.priority && !validPriorities.includes(row.priority)) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          obligation_id: row.obligation_id,
          error: `Invalid priority "${row.priority}". Must be one of: ${validPriorities.join(', ')}`,
        });
        continue;
      }

      try {
        // Verify obligation exists and belongs to workspace
        const { data: obligation, error: fetchError } = await supabase
          .from('obligations')
          .select('id, workspace_id')
          .eq('id', row.obligation_id)
          .eq('workspace_id', ctx.workspaceId)
          .maybeSingle();

        if (fetchError || !obligation) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            obligation_id: row.obligation_id,
            error: 'Obligation not found or no access',
          });
          continue;
        }

        // Build update object
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (row.status) updateData.status = row.status;
        if (row.priority) updateData.priority = row.priority;

        // Update obligation
        const { error: updateError } = await supabase
          .from('obligations')
          .update(updateData)
          .eq('id', row.obligation_id)
          .eq('workspace_id', ctx.workspaceId);

        if (updateError) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            obligation_id: row.obligation_id,
            error: `Update failed: ${updateError.message}`,
          });
        } else {
          result.successful++;
        }
      } catch (err: any) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          obligation_id: row.obligation_id,
          error: `Unexpected error: ${err?.message || 'Unknown'}`,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      result,
      message: `Successfully imported ${result.successful} of ${result.total_rows} obligations`,
    });
  } catch (err: any) {
    console.error('[api/obligations/bulk-import] POST failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to process bulk import' },
      { status: 500 }
    );
  }
}
