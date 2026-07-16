import { NextResponse } from 'next/server';
import { getAssessmentQuestions } from '@/lib/risk-assessment';

export const dynamic = 'force-dynamic';

/** GET /api/assessments/questions — get all assessment questions */
export async function GET() {
  const questions = getAssessmentQuestions();
  return NextResponse.json({
    ok: true,
    questions,
  });
}
