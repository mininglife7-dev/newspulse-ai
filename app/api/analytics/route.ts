import { type NextRequest, NextResponse } from 'next/server';
import {
  trackEvent,
  trackFeatureAdoption,
  getUsageMetrics,
  getUserEvents,
  getEventsByCategory,
  getEventsByAction,
  getFeatureAdoptionStats,
  getSessionInfo,
  calculateCohortMetrics,
  getCohortRetention,
  getAnalyticsSummary,
  formatAnalyticsStatus,
} from '@/lib/analytics-pipeline';

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const timestamp = new Date().toISOString();

  try {
    switch (action) {
      case 'health':
        return NextResponse.json(
          { ok: true, timestamp, payload: getAnalyticsSummary() },
          { status: 200 }
        );

      case 'summary':
        return NextResponse.json(
          { ok: true, timestamp, payload: getAnalyticsSummary() },
          { status: 200 }
        );

      case 'status':
        return NextResponse.json(
          { ok: true, timestamp, payload: { status: formatAnalyticsStatus() } },
          { status: 200 }
        );

      case 'metrics': {
        const startDate = request.nextUrl.searchParams.get('startDate');
        const endDate = request.nextUrl.searchParams.get('endDate');
        const metrics = getUsageMetrics(startDate || undefined, endDate || undefined);
        return NextResponse.json(
          { ok: true, timestamp, payload: metrics },
          { status: 200 }
        );
      }

      case 'user-events': {
        const userId = request.nextUrl.searchParams.get('userId');
        if (typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing userId parameter' },
            { status: 400 }
          );
        }
        const events = getUserEvents(userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: events },
          { status: 200 }
        );
      }

      case 'events-by-category': {
        const category = request.nextUrl.searchParams.get('category');
        if (category !== 'pageview' && category !== 'click' && category !== 'conversion' && category !== 'error' && category !== 'performance') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Invalid category parameter' },
            { status: 400 }
          );
        }
        const events = getEventsByCategory(category as any);
        return NextResponse.json(
          { ok: true, timestamp, payload: events },
          { status: 200 }
        );
      }

      case 'events-by-action': {
        const action = request.nextUrl.searchParams.get('action_param');
        if (!action) {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing action parameter' },
            { status: 400 }
          );
        }
        const events = getEventsByAction(action as any);
        return NextResponse.json(
          { ok: true, timestamp, payload: events },
          { status: 200 }
        );
      }

      case 'features':
        return NextResponse.json(
          { ok: true, timestamp, payload: getFeatureAdoptionStats() },
          { status: 200 }
        );

      case 'session': {
        const sessionId = request.nextUrl.searchParams.get('sessionId');
        if (typeof sessionId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing sessionId parameter' },
            { status: 400 }
          );
        }
        const session = getSessionInfo(sessionId);
        if (!session) {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Session not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { ok: true, timestamp, payload: session },
          { status: 200 }
        );
      }

      case 'cohort': {
        const cohortDate = request.nextUrl.searchParams.get('cohortDate');
        if (typeof cohortDate !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing cohortDate parameter' },
            { status: 400 }
          );
        }
        const metrics = getCohortRetention(cohortDate);
        if (!metrics) {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Cohort not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { ok: true, timestamp, payload: metrics },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            timestamp,
            error: 'Invalid action. Valid actions: health, summary, status, metrics, user-events, events-by-category, events-by-action, features, session, cohort',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        timestamp,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const body = (await request.json()) as unknown;
    if (typeof body !== 'object' || body === null || !('command' in body)) {
      return NextResponse.json(
        { ok: false, timestamp, error: 'Missing command field' },
        { status: 400 }
      );
    }

    const cmd = body as Record<string, unknown>;
    const command = cmd.command as string;

    switch (command) {
      case 'track-event': {
        const category = cmd.category as unknown;
        const action = cmd.action as unknown;
        const options = cmd.options as unknown;

        if (typeof category !== 'string' || typeof action !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid category and action fields' },
            { status: 400 }
          );
        }

        const event = trackEvent(
          category as any,
          action as any,
          typeof options === 'object' && options ? (options as any) : undefined
        );
        return NextResponse.json(
          { ok: true, timestamp, payload: event },
          { status: 200 }
        );
      }

      case 'track-adoption': {
        const feature = cmd.feature as unknown;
        const userId = cmd.user_id as unknown;

        if (typeof feature !== 'string' || typeof userId !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid feature and user_id fields' },
            { status: 400 }
          );
        }

        const adoption = trackFeatureAdoption(feature, userId);
        return NextResponse.json(
          { ok: true, timestamp, payload: adoption },
          { status: 200 }
        );
      }

      case 'calculate-cohort': {
        const cohortDate = cmd.cohort_date as unknown;

        if (typeof cohortDate !== 'string') {
          return NextResponse.json(
            { ok: false, timestamp, error: 'Missing or invalid cohort_date field' },
            { status: 400 }
          );
        }

        const metrics = calculateCohortMetrics(cohortDate);
        return NextResponse.json(
          { ok: true, timestamp, payload: metrics },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            timestamp,
            error: 'Invalid command. Valid commands: track-event, track-adoption, calculate-cohort',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        timestamp,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
