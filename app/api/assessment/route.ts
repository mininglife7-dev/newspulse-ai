import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Use /api/assessments instead' },
    { status: 301, headers: { Location: '/api/assessments' } }
  );
}
