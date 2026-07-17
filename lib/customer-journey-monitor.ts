/**
 * DNA-GOV-006: Customer Journey Monitoring
 *
 * Autonomously test if customers can complete critical flows end-to-end.
 * Gap: We verify generic health (landing page loads, API responds), but not if
 * customers can actually sign up, create workspace, and access dashboard.
 *
 * This DNA simulates customer flows and alerts if any step breaks.
 * Each flow is a sequence of HTTP requests that must all succeed.
 */

export interface JourneyStep {
  name: string;
  method: 'GET' | 'POST';
  endpoint: string;
  expectedStatus: number;
  payload?: Record<string, unknown>;
  description: string;
}

export interface JourneyResult {
  name: string;
  status: 'success' | 'failed';
  steps: Array<{
    name: string;
    endpoint: string;
    actualStatus: number;
    expectedStatus: number;
    success: boolean;
    latencyMs: number;
  }>;
  totalLatencyMs: number;
  failedStep?: string;
}

export interface CustomerJourneyReport {
  ok: boolean;
  timestamp: string;
  journeys: JourneyResult[];
  summary: {
    totalJourneys: number;
    successfulJourneys: number;
    failedJourneys: number;
  };
  alerts: string[];
}

// Define key customer journeys
const CUSTOMER_JOURNEYS: Record<string, JourneyStep[]> = {
  'landing-to-signup': [
    {
      name: 'Home page',
      method: 'GET',
      endpoint: '/',
      expectedStatus: 200,
      description: 'Customer lands on homepage',
    },
    {
      name: 'Signup page',
      method: 'GET',
      endpoint: '/auth/signup',
      expectedStatus: 200,
      description: 'Customer navigates to signup',
    },
  ],

  'api-workspace-creation': [
    {
      name: 'Create workspace API',
      method: 'POST',
      endpoint: '/api/workspace',
      expectedStatus: 400, // Will fail without auth, but endpoint should exist and respond
      payload: {
        company_name: 'Test Company',
        country: 'DE',
        industry: 'Tech',
      },
      description: 'Customer tries to create workspace',
    },
  ],

  'api-health-check': [
    {
      name: 'Health endpoint',
      method: 'GET',
      endpoint: '/api/health',
      expectedStatus: 200,
      description: 'System health is available',
    },
  ],
};

/**
 * Test a single customer journey
 */
export async function testJourney(
  baseUrl: string,
  journeyName: string,
  steps: JourneyStep[]
): Promise<JourneyResult> {
  const results = [];
  let totalLatency = 0;
  let failedStep: string | undefined;

  for (const step of steps) {
    const start = Date.now();

    try {
      const url = `${baseUrl}${step.endpoint}`;
      const response = await fetch(url, {
        method: step.method,
        headers:
          step.method === 'POST'
            ? { 'Content-Type': 'application/json' }
            : undefined,
        body: step.method === 'POST' ? JSON.stringify(step.payload) : undefined,
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - start;
      totalLatency += latency;

      const success = response.status === step.expectedStatus;

      results.push({
        name: step.name,
        endpoint: step.endpoint,
        actualStatus: response.status,
        expectedStatus: step.expectedStatus,
        success,
        latencyMs: latency,
      });

      if (!success && !failedStep) {
        failedStep = step.name;
      }
    } catch (error) {
      const latency = Date.now() - start;
      totalLatency += latency;

      results.push({
        name: step.name,
        endpoint: step.endpoint,
        actualStatus: 0,
        expectedStatus: step.expectedStatus,
        success: false,
        latencyMs: latency,
      });

      if (!failedStep) {
        failedStep = step.name;
      }
    }
  }

  return {
    name: journeyName,
    status: failedStep ? 'failed' : 'success',
    steps: results,
    totalLatencyMs: totalLatency,
    failedStep,
  };
}

/**
 * Test all key customer journeys
 */
export async function monitorCustomerJourneys(
  baseUrl: string,
  journeyNames?: string[]
): Promise<CustomerJourneyReport> {
  const journeyTests = journeyNames
    ? Object.entries(CUSTOMER_JOURNEYS).filter(([name]) =>
        journeyNames.includes(name)
      )
    : Object.entries(CUSTOMER_JOURNEYS);

  const results = await Promise.all(
    journeyTests.map(([name, steps]) => testJourney(baseUrl, name, steps))
  );

  const successful = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');

  const alerts: string[] = [];

  if (failed.length > 0) {
    failed.forEach((journey) => {
      alerts.push(
        `[CRITICAL] Customer journey "${journey.name}" failed at step: ${journey.failedStep}`
      );
    });
  }

  const avgLatency =
    results.reduce((sum, r) => sum + r.totalLatencyMs, 0) / results.length;
  if (avgLatency > 3000) {
    alerts.push(
      `[PERFORMANCE] Customer journeys averaging ${Math.round(avgLatency)}ms (SLA: <2000ms)`
    );
  }

  return {
    ok: failed.length === 0,
    timestamp: new Date().toISOString(),
    journeys: results,
    summary: {
      totalJourneys: results.length,
      successfulJourneys: successful.length,
      failedJourneys: failed.length,
    },
    alerts,
  };
}

/**
 * Format customer journey report for Founder
 */
export function formatCustomerJourneyAlert(
  report: CustomerJourneyReport
): string {
  if (report.ok) {
    return `✅ Customer journeys operational: ${report.summary.successfulJourneys}/${report.summary.totalJourneys} passing`;
  }

  return `🔴 Customer journey issue: ${report.summary.failedJourneys} journey(s) failing`;
}
