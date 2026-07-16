import { NextResponse } from 'next/server';

interface JourneyMetric {
  timestamp: string;
  stage: string;
  count: number;
  dropoffFromPrevious: number;
  dropoffRate: number;
}

interface FunnelStage {
  name: string;
  displayName: string;
  description: string;
  count: number;
  successRate: number;
  avgTimeSeconds: number;
}

interface FrictionPoint {
  stage: string;
  dropoffRate: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export async function GET() {
  // In production, this would aggregate from:
  // - auth_users table (user creation events)
  // - workspaces table (workspace creation events)
  // - ai_systems table (inventory creation events)
  // - user_events table (funnel tracking events)

  // Funnel stages for customer journey:
  // 1. signup_page_view: User visits signup page
  // 2. form_submitted: User submits signup form
  // 3. email_sent: Verification email dispatched
  // 4. email_verified: User verifies email
  // 5. profile_created: User completes profile
  // 6. workspace_created: User creates workspace
  // 7. first_ai_system_added: User adds first AI system

  const now = new Date();
  const stages: FunnelStage[] = [
    {
      name: 'signup_page_view',
      displayName: 'Signup Page View',
      description: 'Users who visited the signup page',
      count: 1250,
      successRate: 100,
      avgTimeSeconds: 0,
    },
    {
      name: 'form_submitted',
      displayName: 'Form Submitted',
      description: 'Users who submitted the signup form',
      count: 856,
      successRate: 68.5,
      avgTimeSeconds: 45,
    },
    {
      name: 'email_sent',
      displayName: 'Verification Email Sent',
      description: 'Verification emails successfully sent',
      count: 856,
      successRate: 68.5,
      avgTimeSeconds: 2,
    },
    {
      name: 'email_verified',
      displayName: 'Email Verified',
      description: 'Users who verified their email',
      count: 742,
      successRate: 59.4,
      avgTimeSeconds: 180,
    },
    {
      name: 'profile_created',
      displayName: 'Profile Created',
      description: 'Users who completed their profile',
      count: 698,
      successRate: 55.8,
      avgTimeSeconds: 120,
    },
    {
      name: 'workspace_created',
      displayName: 'Workspace Created',
      description: 'Users who created their first workspace',
      count: 645,
      successRate: 51.6,
      avgTimeSeconds: 90,
    },
    {
      name: 'first_ai_system_added',
      displayName: 'First AI System Added',
      description: 'Users who added their first AI system',
      count: 567,
      successRate: 45.4,
      avgTimeSeconds: 240,
    },
  ];

  // Calculate dropoff metrics
  const journeyMetrics: JourneyMetric[] = stages.map((stage, index) => {
    const previousCount = index === 0 ? stage.count : stages[index - 1].count;
    const dropoffFromPrevious = previousCount - stage.count;
    const dropoffRate =
      previousCount > 0 ? (dropoffFromPrevious / previousCount) * 100 : 0;

    return {
      timestamp: now.toISOString(),
      stage: stage.name,
      count: stage.count,
      dropoffFromPrevious,
      dropoffRate: parseFloat(dropoffRate.toFixed(1)),
    };
  });

  // Detect friction points (dropoff > 10%)
  const frictionPoints: FrictionPoint[] = journeyMetrics
    .filter((m) => m.dropoffRate > 10)
    .map((m) => {
      const stage = stages.find((s) => s.name === m.stage);
      const dropoffRate = m.dropoffRate;

      let severity: 'critical' | 'high' | 'medium' | 'low';
      let recommendation: string;

      if (dropoffRate > 25) {
        severity = 'critical';
        recommendation = `Critical friction at ${stage?.displayName}: ${dropoffRate.toFixed(1)}% drop. Requires immediate investigation and UX audit.`;
      } else if (dropoffRate > 15) {
        severity = 'high';
        recommendation = `High friction at ${stage?.displayName}: ${dropoffRate.toFixed(1)}% drop. Consider A/B testing improvements.`;
      } else {
        severity = 'medium';
        recommendation = `Moderate friction at ${stage?.displayName}: ${dropoffRate.toFixed(1)}% drop. Monitor and optimize.`;
      }

      return {
        stage: stage?.name || m.stage,
        dropoffRate,
        severity,
        recommendation,
      };
    });

  // Calculate key metrics
  const totalSignupAttempts = stages[0].count;
  const totalCompletions = stages[stages.length - 1].count;
  const overallConversionRate = (totalCompletions / totalSignupAttempts) * 100;
  const largestDropoffStage = journeyMetrics.reduce((max, m) =>
    m.dropoffRate > max.dropoffRate ? m : max
  );

  // Calculate average time to completion
  const avgTimeToCompletion = stages.reduce(
    (sum, s) => sum + s.avgTimeSeconds,
    0
  );

  return NextResponse.json(
    {
      timestamp: now.toISOString(),
      period: 'last_7d',
      funnel: {
        stages,
        metrics: journeyMetrics,
      },
      summary: {
        totalSignupAttempts,
        totalCompletions,
        overallConversionRate: parseFloat(overallConversionRate.toFixed(2)),
        conversionRatePercent: parseFloat(overallConversionRate.toFixed(2)),
        largestDropoffStage: largestDropoffStage.stage,
        largestDropoffRate: largestDropoffStage.dropoffRate,
        avgTimeToCompletionSeconds: avgTimeToCompletion,
        frictionPointCount: frictionPoints.length,
      },
      frictionPoints,
      recommendations: [
        frictionPoints.length > 0
          ? `${frictionPoints.length} friction point(s) detected requiring attention`
          : 'Funnel is healthy with no critical friction points',
        overallConversionRate < 40
          ? 'Overall conversion rate below target (40%). Recommend comprehensive UX audit.'
          : 'Conversion rate on track',
        largestDropoffStage.dropoffRate > 15
          ? `Largest drop at ${largestDropoffStage.stage} (${largestDropoffStage.dropoffRate}%). Prioritize investigation here.`
          : 'Dropoff distribution is relatively even across stages',
      ],
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, max-age=60',
        'X-Friction-Points': frictionPoints.length.toString(),
        'X-Conversion-Rate': overallConversionRate.toFixed(2),
      },
    }
  );
}
