/**
 * DNA-GOV-014: Product Observability
 *
 * Track customer behavior, feature adoption, and system health.
 * Enables data-driven decisions on product improvements and early error detection.
 *
 * Purpose: Understand how customers use the product and detect issues early.
 */

export type EventType =
  | 'signup_started'
  | 'email_verified'
  | 'workspace_created'
  | 'first_assessment_started'
  | 'first_assessment_completed'
  | 'assessment_created'
  | 'obligation_created'
  | 'evidence_uploaded'
  | 'assessment_exported'
  | 'framework_selected'
  | 'api_error'
  | 'validation_error'
  | 'auth_error'
  | 'timeout_error'
  | 'page_load'
  | 'api_request';

export type EventCategory = 'funnel' | 'feature_adoption' | 'error' | 'performance';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface ProductEvent {
  workspace_id: string;
  user_id: string;
  event_type: EventType;
  category: EventCategory;
  metadata: Record<string, any>;
  created_at?: string;
}

export interface EventAggregate {
  date: string;
  workspace_id?: string;
  event_type?: string;
  metric_name: string;
  metric_value: number;
}

export interface ObservabilityAlert {
  id: string;
  workspace_id: string;
  alert_type: string;
  threshold: number;
  current_value?: number;
  triggered_at?: string;
  resolved_at?: string;
  severity: AlertSeverity;
}

export interface FunnelStep {
  stage: string;
  count: number;
  pct: number;
}

export interface FunnelAnalysis {
  funnel: FunnelStep[];
  total_entries: number;
  completion_rate: number;
}

export interface HealthMetrics {
  api_p95_latency_ms: number;
  error_rate: number;
  uptime_pct: number;
  alerts: ObservabilityAlert[];
}

// Event sampling for high-volume metrics
const SAMPLING_RATES: Record<EventType, number> = {
  'signup_started': 1.0,
  'email_verified': 1.0,
  'workspace_created': 1.0,
  'first_assessment_started': 1.0,
  'first_assessment_completed': 1.0,
  'assessment_created': 1.0,
  'obligation_created': 1.0,
  'evidence_uploaded': 1.0,
  'assessment_exported': 1.0,
  'framework_selected': 1.0,
  'api_error': 1.0,
  'validation_error': 0.1, // Sample 10% of validation errors
  'auth_error': 1.0,
  'timeout_error': 1.0,
  'page_load': 0.01, // Sample 1% of page loads
  'api_request': 0.01, // Sample 1% of API requests
};

/**
 * Determine if event should be sampled based on rate
 */
export function shouldSampleEvent(eventType: EventType): boolean {
  const rate = SAMPLING_RATES[eventType];
  return Math.random() < rate;
}

/**
 * Record a product event
 */
export async function recordProductEvent(event: ProductEvent): Promise<boolean> {
  try {
    if (!shouldSampleEvent(event.event_type)) {
      return true; // Silently skip unsampled events
    }

    const response = await fetch('/api/telemetry/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    return response.ok;
  } catch (err) {
    console.error('[product-observability] Failed to record event:', err);
    return false;
  }
}

/**
 * Record signup funnel event
 */
export async function recordSignupEvent(
  workspaceId: string,
  userId: string,
  stage: 'started' | 'verified' | 'workspace_created' | 'assessment_started' | 'assessment_completed'
): Promise<boolean> {
  const eventTypeMap = {
    started: 'signup_started',
    verified: 'email_verified',
    workspace_created: 'workspace_created',
    assessment_started: 'first_assessment_started',
    assessment_completed: 'first_assessment_completed',
  } as const;

  return recordProductEvent({
    workspace_id: workspaceId,
    user_id: userId,
    event_type: eventTypeMap[stage] as EventType,
    category: 'funnel',
    metadata: { stage },
  });
}

/**
 * Record feature adoption event
 */
export async function recordFeatureEvent(
  workspaceId: string,
  userId: string,
  feature: 'assessment' | 'obligation' | 'evidence' | 'export' | 'framework',
  metadata?: Record<string, any>
): Promise<boolean> {
  const eventTypeMap = {
    assessment: 'assessment_created',
    obligation: 'obligation_created',
    evidence: 'evidence_uploaded',
    export: 'assessment_exported',
    framework: 'framework_selected',
  } as const;

  return recordProductEvent({
    workspace_id: workspaceId,
    user_id: userId,
    event_type: eventTypeMap[feature] as EventType,
    category: 'feature_adoption',
    metadata: metadata || { feature },
  });
}

/**
 * Record error event
 */
export async function recordErrorEvent(
  workspaceId: string,
  userId: string,
  errorType: 'api' | 'validation' | 'auth' | 'timeout',
  metadata?: Record<string, any>
): Promise<boolean> {
  const eventTypeMap = {
    api: 'api_error',
    validation: 'validation_error',
    auth: 'auth_error',
    timeout: 'timeout_error',
  } as const;

  return recordProductEvent({
    workspace_id: workspaceId,
    user_id: userId,
    event_type: eventTypeMap[errorType] as EventType,
    category: 'error',
    metadata: metadata || { error_type: errorType },
  });
}

/**
 * Record performance event
 */
export async function recordPerformanceEvent(
  workspaceId: string,
  userId: string,
  metric: 'page_load' | 'api_request',
  metadata: Record<string, any>
): Promise<boolean> {
  return recordProductEvent({
    workspace_id: workspaceId,
    user_id: userId,
    event_type: metric,
    category: 'performance',
    metadata,
  });
}

/**
 * Get funnel analysis for a workspace
 */
export async function getFunnelAnalysis(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<FunnelAnalysis> {
  try {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await fetch(`/api/analytics/funnel?${params}`);
    if (!response.ok) throw new Error(`Analytics API error: ${response.status}`);

    return response.json();
  } catch (err) {
    console.error('[product-observability] Failed to get funnel analysis:', err);
    return {
      funnel: [],
      total_entries: 0,
      completion_rate: 0,
    };
  }
}

/**
 * Get health metrics for monitoring
 */
export async function getHealthMetrics(workspaceId?: string): Promise<HealthMetrics> {
  try {
    const url = workspaceId
      ? `/api/analytics/health?workspace_id=${workspaceId}`
      : '/api/analytics/health';

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Health API error: ${response.status}`);

    return response.json();
  } catch (err) {
    console.error('[product-observability] Failed to get health metrics:', err);
    return {
      api_p95_latency_ms: 0,
      error_rate: 0,
      uptime_pct: 100,
      alerts: [],
    };
  }
}

/**
 * Check if error rate exceeds threshold
 */
export function isErrorRateHigh(metrics: HealthMetrics, threshold = 0.01): boolean {
  return metrics.error_rate > threshold;
}

/**
 * Check if latency exceeds threshold
 */
export function isLatencyHigh(metrics: HealthMetrics, threshold = 500): boolean {
  return metrics.api_p95_latency_ms > threshold;
}

/**
 * Get alerts for workspace
 */
export function getActiveAlerts(metrics: HealthMetrics): ObservabilityAlert[] {
  return metrics.alerts.filter((a) => !a.resolved_at);
}
