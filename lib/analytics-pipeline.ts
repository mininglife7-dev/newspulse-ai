/**
 * DNS-GOV-017: Analytics Pipeline
 *
 * Enable product telemetry: track user behavior, usage patterns, feature adoption,
 * and performance metrics. Provide insights for product decisions and customer
 * retention. Support event-based analytics (pageviews, clicks, conversions) and
 * aggregated metrics (DAU, feature adoption, session duration).
 *
 * Problem: No visibility into how users interact with the product. Cannot measure
 * feature adoption, identify drop-off points, or detect usage trends. Product
 * decisions based on guesses, not data. Need: event tracking, aggregation,
 * retention metrics, cohort analysis.
 */

export type EventCategory = 'pageview' | 'click' | 'conversion' | 'error' | 'performance';
export type EventAction =
  | 'signup'
  | 'login'
  | 'logout'
  | 'workspace_create'
  | 'workspace_invite'
  | 'search_perform'
  | 'article_view'
  | 'feature_toggle'
  | 'error_encountered'
  | 'page_load';

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  userId?: string;
  category: EventCategory;
  action: EventAction;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
  sessionId: string;
  userAgent?: string;
  referrer?: string;
}

export interface UsageMetrics {
  timestamp: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  avgSessionDuration: number;
  pageViews: number;
  bounceRate: number;
  conversions: number;
}

export interface FeatureAdoption {
  feature: string;
  totalUsers: number;
  adoptedUsers: number;
  adoptionRate: number;
  lastUpdated: string;
  adoptedUserIds?: Set<string>;
}

export interface CohortMetrics {
  cohortDate: string;
  cohortSize: number;
  retention: Record<number, number>; // day -> retention percentage
  churnRate: number;
  ltv?: number; // lifetime value
}

export interface AnalyticsState {
  events: AnalyticsEvent[];
  sessions: Map<string, { userId?: string; startedAt: string; lastActivity: string }>;
  usageMetrics: UsageMetrics[];
  featureAdoption: Map<string, FeatureAdoption>;
  cohorts: Map<string, CohortMetrics>;
  lastProcessed: string;
}

// In-memory analytics state (would integrate with analytics backend in production)
const analyticsState: AnalyticsState = {
  events: [],
  sessions: new Map(),
  usageMetrics: [],
  featureAdoption: new Map(),
  cohorts: new Map(),
  lastProcessed: new Date().toISOString(),
};

let eventIdCounter = 0;
let sessionIdCounter = 0;

/**
 * Track an analytics event
 */
export function trackEvent(
  category: EventCategory,
  action: EventAction,
  options?: {
    userId?: string;
    label?: string;
    value?: number;
    properties?: Record<string, unknown>;
    sessionId?: string;
    userAgent?: string;
    referrer?: string;
  }
): AnalyticsEvent {
  eventIdCounter++;
  const sessionId = options?.sessionId || `session-${sessionIdCounter}`;

  const event: AnalyticsEvent = {
    id: `evt-${eventIdCounter}`,
    timestamp: new Date().toISOString(),
    userId: options?.userId,
    category,
    action,
    label: options?.label,
    value: options?.value,
    properties: options?.properties,
    sessionId,
    userAgent: options?.userAgent,
    referrer: options?.referrer,
  };

  analyticsState.events.push(event);

  // Keep history bounded at 10000 events
  if (analyticsState.events.length > 10000) {
    analyticsState.events.shift();
  }

  // Update session activity
  if (!analyticsState.sessions.has(sessionId)) {
    analyticsState.sessions.set(sessionId, {
      userId: options?.userId,
      startedAt: event.timestamp,
      lastActivity: event.timestamp,
    });
  } else {
    const session = analyticsState.sessions.get(sessionId)!;
    session.lastActivity = event.timestamp;
  }

  return event;
}

/**
 * Track feature adoption
 */
export function trackFeatureAdoption(feature: string, userId: string): FeatureAdoption {
  const key = `${feature}-adoption`;

  if (!analyticsState.featureAdoption.has(key)) {
    analyticsState.featureAdoption.set(key, {
      feature,
      totalUsers: 1,
      adoptedUsers: 1,
      adoptionRate: 1.0,
      lastUpdated: new Date().toISOString(),
      adoptedUserIds: new Set([userId]),
    });
  } else {
    const adoption = analyticsState.featureAdoption.get(key)!;
    if (!adoption.adoptedUserIds) {
      adoption.adoptedUserIds = new Set();
    }
    const isNewUser = !adoption.adoptedUserIds.has(userId);
    adoption.totalUsers++;

    if (isNewUser) {
      adoption.adoptedUserIds.add(userId);
      adoption.adoptedUsers++;
      adoption.lastUpdated = new Date().toISOString();
    }

    adoption.adoptionRate = adoption.adoptedUsers / adoption.totalUsers;
  }

  return analyticsState.featureAdoption.get(key)!;
}

/**
 * Get usage metrics for a time period
 */
export function getUsageMetrics(
  startDate?: string,
  endDate?: string
): UsageMetrics | undefined {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const filteredEvents = analyticsState.events.filter((e) => {
    const eventDate = new Date(e.timestamp);
    return eventDate >= start && eventDate <= end;
  });

  if (filteredEvents.length === 0) return undefined;

  const uniqueUsers = new Set(filteredEvents.map((e) => e.userId).filter(Boolean));
  const uniqueSessions = new Set(filteredEvents.map((e) => e.sessionId));
  const pageViews = filteredEvents.filter((e) => e.category === 'pageview').length;
  const conversions = filteredEvents.filter((e) => e.category === 'conversion').length;

  // Calculate bounce rate (sessions with only one pageview)
  let bouncedSessions = 0;
  uniqueSessions.forEach((sessionId) => {
    const sessionEvents = filteredEvents.filter((e) => e.sessionId === sessionId);
    if (
      sessionEvents.length === 1 &&
      sessionEvents[0].category === 'pageview'
    ) {
      bouncedSessions++;
    }
  });
  const bounceRate = uniqueSessions.size > 0 ? bouncedSessions / uniqueSessions.size : 0;

  // Calculate average session duration
  let totalDuration = 0;
  uniqueSessions.forEach((sessionId) => {
    const sessionEvents = filteredEvents.filter((e) => e.sessionId === sessionId);
    if (sessionEvents.length > 0) {
      const firstEvent = new Date(sessionEvents[0].timestamp);
      const lastEvent = new Date(sessionEvents[sessionEvents.length - 1].timestamp);
      totalDuration += (lastEvent.getTime() - firstEvent.getTime()) / 1000; // seconds
    }
  });
  const avgSessionDuration = uniqueSessions.size > 0 ? totalDuration / uniqueSessions.size : 0;

  const metrics: UsageMetrics = {
    timestamp: end.toISOString(),
    activeUsers: uniqueUsers.size,
    newUsers: 0, // Would require tracking first-seen dates
    sessions: uniqueSessions.size,
    avgSessionDuration,
    pageViews,
    bounceRate,
    conversions,
  };

  analyticsState.usageMetrics.push(metrics);

  // Keep history bounded
  if (analyticsState.usageMetrics.length > 1000) {
    analyticsState.usageMetrics.shift();
  }

  return metrics;
}

/**
 * Get all events for a user
 */
export function getUserEvents(userId: string): AnalyticsEvent[] {
  return analyticsState.events.filter((e) => e.userId === userId);
}

/**
 * Get events by category
 */
export function getEventsByCategory(category: EventCategory): AnalyticsEvent[] {
  return analyticsState.events.filter((e) => e.category === category);
}

/**
 * Get events by action
 */
export function getEventsByAction(action: EventAction): AnalyticsEvent[] {
  return analyticsState.events.filter((e) => e.action === action);
}

/**
 * Get feature adoption stats
 */
export function getFeatureAdoptionStats(): FeatureAdoption[] {
  return Array.from(analyticsState.featureAdoption.values());
}

/**
 * Get session info
 */
export function getSessionInfo(sessionId: string) {
  const session = analyticsState.sessions.get(sessionId);
  if (!session) return undefined;

  const sessionEvents = analyticsState.events.filter((e) => e.sessionId === sessionId);
  const startTime = new Date(session.startedAt);
  const endTime = new Date(session.lastActivity);
  const duration = (endTime.getTime() - startTime.getTime()) / 1000; // seconds

  return {
    sessionId,
    userId: session.userId,
    startedAt: session.startedAt,
    lastActivity: session.lastActivity,
    duration,
    eventCount: sessionEvents.length,
    events: sessionEvents,
  };
}

/**
 * Get retention cohort
 */
export function getCohortRetention(cohortDate: string): CohortMetrics | undefined {
  return analyticsState.cohorts.get(cohortDate);
}

/**
 * Calculate cohort metrics
 */
export function calculateCohortMetrics(cohortDate: string): CohortMetrics {
  const cohortStart = new Date(cohortDate);
  const cohortEnd = new Date(cohortStart.getTime() + 24 * 60 * 60 * 1000);

  // Get users who had activity on cohort date
  const cohortUsers = new Set<string>();
  analyticsState.events.forEach((e) => {
    const eventDate = new Date(e.timestamp);
    if (eventDate >= cohortStart && eventDate < cohortEnd && e.userId) {
      cohortUsers.add(e.userId);
    }
  });

  const cohortSize = cohortUsers.size;
  const retention: Record<number, number> = {};
  const today = new Date();

  // Calculate retention for each day since cohort
  for (let day = 0; day <= 30; day++) {
    const checkDate = new Date(cohortStart.getTime() + day * 24 * 60 * 60 * 1000);
    if (checkDate > today) break;

    const checkEnd = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000);
    let retainedUsers = 0;

    cohortUsers.forEach((userId) => {
      const hasActivity = analyticsState.events.some(
        (e) =>
          e.userId === userId &&
          new Date(e.timestamp) >= checkDate &&
          new Date(e.timestamp) < checkEnd
      );
      if (hasActivity) retainedUsers++;
    });

    retention[day] = cohortSize > 0 ? retainedUsers / cohortSize : 0;
  }

  const churnRate = retention[1] ? 1 - retention[1] : 0;

  const metrics: CohortMetrics = {
    cohortDate,
    cohortSize,
    retention,
    churnRate,
  };

  analyticsState.cohorts.set(cohortDate, metrics);
  return metrics;
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentEvents = analyticsState.events.filter(
    (e) => new Date(e.timestamp) >= last24h
  );
  const uniqueUsers = new Set(recentEvents.map((e) => e.userId).filter(Boolean));
  const uniqueSessions = new Set(recentEvents.map((e) => e.sessionId));

  return {
    totalEvents: analyticsState.events.length,
    recentEvents: recentEvents.length,
    uniqueUsers: uniqueUsers.size,
    uniqueSessions: uniqueSessions.size,
    features: analyticsState.featureAdoption.size,
    cohorts: analyticsState.cohorts.size,
    lastProcessed: analyticsState.lastProcessed,
  };
}

/**
 * Format analytics status for display
 */
export function formatAnalyticsStatus(): string {
  const summary = getAnalyticsSummary();
  const lastMetrics = analyticsState.usageMetrics[analyticsState.usageMetrics.length - 1];

  let status = `📊 Analytics Pipeline | ${summary.totalEvents} events | ${summary.uniqueUsers} users`;

  if (lastMetrics) {
    status += ` | ${lastMetrics.conversions} conversions`;
    status += ` | Bounce: ${(lastMetrics.bounceRate * 100).toFixed(1)}%`;
  }

  status += ` | Features tracked: ${summary.features}`;

  return status;
}

/**
 * Reset analytics state (testing)
 */
export function resetAnalyticsPipeline(): void {
  analyticsState.events = [];
  analyticsState.sessions.clear();
  analyticsState.usageMetrics = [];
  analyticsState.featureAdoption.clear();
  analyticsState.cohorts.clear();
  analyticsState.lastProcessed = new Date().toISOString();
  eventIdCounter = 0;
  sessionIdCounter = 0;
}
