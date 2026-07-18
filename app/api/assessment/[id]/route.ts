import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(
    { error: `Use /api/assessments/${id} instead` },
    { status: 301, headers: { Location: `/api/assessments/${id}` } }
  );
}
