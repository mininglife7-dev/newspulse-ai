import { requireAdminToken, unauthorizedResponse } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import {
  captureError,
  aggregateErrorMetrics,
  formatErrorAlert,
  getErrorSummary,
  ErrorTracker,
} from '@/lib/error-tracking';

export const dynamic = 'force-dynamic';

// Global error tracker instance (persists for session duration)
const errorTracker = new ErrorTracker();

export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const metrics = errorTracker.getMetrics();
    const alert = formatErrorAlert(metrics);

    const statusCode = metrics.criticalErrors > 0 ? 206 : 200;

    return NextResponse.json(
      {
        status: statusCode === 200 ? 'healthy' : 'degraded',
        timestamp: metrics.timestamp,
        totalErrors: metrics.totalErrors,
        criticalErrors: metrics.criticalErrors,
        errorsByCategory: metrics.errorsByCategory,
        errorsBySeverity: metrics.errorsBySeverity,
        uniquePatterns: metrics.uniquePatterns,
        errorRate: metrics.errorRate,
        topPatterns: metrics.topPatterns,
        alert,
      },
      {
        status: statusCode,
        headers: {
          'X-Total-Errors': String(metrics.totalErrors),
          'X-Critical-Errors': String(metrics.criticalErrors),
          'X-Unique-Patterns': String(metrics.uniquePatterns),
          'X-Error-Rate': metrics.errorRate.toFixed(2),
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error retrieving error metrics';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await request.json();
    const { error: errorData, endpoint, userId, context } = body;

    if (!errorData) {
      return NextResponse.json(
        { error: 'Invalid request: error object required' },
        { status: 400 }
      );
    }

    // Capture the error
    const errorMessage =
      typeof errorData === 'string' ? new Error(errorData) : errorData;
    const event = await captureError(errorMessage, {
      endpoint,
      userId,
      context,
    });

    // Store in tracker
    errorTracker.captureError(event);

    // Generate metrics
    const metrics = errorTracker.getMetrics();
    const alert = formatErrorAlert(metrics);

    const statusCode = metrics.criticalErrors > 0 ? 206 : 200;

    return NextResponse.json(
      {
        status: statusCode === 200 ? 'captured' : 'captured-with-warnings',
        eventId: event.id,
        category: event.category,
        severity: event.severity,
        fingerprint: event.fingerprint,
        metrics,
        alert,
      },
      {
        status: 201,
        headers: {
          'X-Event-ID': event.id,
          'X-Total-Errors': String(metrics.totalErrors),
          'X-Critical-Errors': String(metrics.criticalErrors),
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error processing error event';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return unauthorizedResponse();
  }
  try {
    errorTracker.reset();

    return NextResponse.json(
      {
        status: 'reset',
        message: 'Error tracker cleared',
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error resetting tracker';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
      },
      { status: 503 }
    );
  }
}
