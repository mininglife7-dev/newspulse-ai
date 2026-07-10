/**
 * DNS-023: Incident Response System Observability
 *
 * Comprehensive metrics and observability for the entire incident response lifecycle.
 * Enables validation that incidents are handled end-to-end and measures system effectiveness.
 * Closes the feedback loop: measure → learn → improve → validate improvements.
 */

export interface IncidentEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  eventType: 'created' | 'alert-correlated' | 'assigned' | 'remediation-started' | 'notification-sent' | 'resolved' | 'post-mortem-completed';
  source: string; // which system generated this event (DNS-017, DNS-022, DNS-021, etc.)
  details: Record<string, unknown>;
}

export interface IncidentMetrics {
  totalIncidents: number;
  resolvedIncidents: number;
  unresolvedIncidents: number;
  averageMTTD: number; // minutes to detection
  averageMTTR: number; // minutes to resolution
  successRate: number; // % of incidents resolved by playbook
  playbookEffectiveness: Record<string, number>; // category -> effectiveness %
  medianResolutionTime: number;
  p95ResolutionTime: number;
  p99ResolutionTime: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  trendMagnitude: number; // percentage change
}

export interface AlertMetrics {
  totalAlerts: number;
  suppressedAlerts: number;
  alertReductionPercent: number;
  averageCorrelationScore: number;
  averageGroupSize: number;
  falsePositiveRate: number; // % of correlated alerts that were not real incidents
  patternsTriggered: Record<string, number>; // pattern -> count
}

export interface PlaybookMetrics {
  totalPlaybooks: number;
  averageEffectiveness: number;
  improvementsApplied: number;
  playbooksNeedingImprovement: number;
  mostEffective: string; // playbook category
  leastEffective: string; // playbook category
  trendDirection: 'improving' | 'stable' | 'declining';
}

export interface SystemHealthMetrics {
  detectionSystemHealthy: boolean;
  correlationSystemHealthy: boolean;
  incidentCommandHealthy: boolean;
  communicationSystemHealthy: boolean;
  remediationSystemHealthy: boolean;
  postmortemSystemHealthy: boolean;
  lastSystemCheck: string;
  systemUptime: number; // percentage
  systemErrors: number;
}

export interface IncidentLifecycleMetrics {
  incidentId: string;
  category: string;
  createdAt: string;
  resolvedAt?: string;
  status: 'detecting' | 'correlating' | 'commanding' | 'remediating' | 'communicating' | 'resolved';
  detectionTime?: number; // minutes
  correlationTime?: number; // minutes
  commandTime?: number; // minutes
  remediationTime?: number; // minutes
  totalResolutionTime?: number; // minutes
  playbookUsed?: string;
  playbookSuccessful?: boolean;
  customerImpact?: 'critical' | 'high' | 'medium' | 'low';
  events: IncidentEvent[];
}

// In-memory stores
const incidents = new Map<string, IncidentLifecycleMetrics>();
const incidentEvents: IncidentEvent[] = [];
const systemHealth: SystemHealthMetrics = {
  detectionSystemHealthy: true,
  correlationSystemHealthy: true,
  incidentCommandHealthy: true,
  communicationSystemHealthy: true,
  remediationSystemHealthy: true,
  postmortemSystemHealthy: true,
  lastSystemCheck: new Date().toISOString(),
  systemUptime: 100,
  systemErrors: 0,
};

/**
 * Record incident lifecycle event
 */
export function recordIncidentEvent(
  incidentId: string,
  eventType: IncidentEvent['eventType'],
  source: string,
  details?: Record<string, unknown>
): IncidentEvent {
  const event: IncidentEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    incidentId,
    timestamp: new Date().toISOString(),
    eventType,
    source,
    details: details || {},
  };

  incidentEvents.push(event);

  // Update incident lifecycle metrics
  const incident = incidents.get(incidentId);
  if (incident) {
    incident.events.push(event);

    // Update status based on event type
    if (eventType === 'created') {
      incident.status = 'detecting';
      incident.createdAt = event.timestamp;
    } else if (eventType === 'alert-correlated') {
      incident.status = 'correlating';
      if (!incident.detectionTime && incident.createdAt) {
        const createdTime = new Date(incident.createdAt).getTime();
        const eventTime = new Date(event.timestamp).getTime();
        incident.detectionTime = Math.round((eventTime - createdTime) / 60000); // minutes
      }
    } else if (eventType === 'assigned') {
      incident.status = 'commanding';
      if (!incident.correlationTime && incident.createdAt) {
        const createdTime = new Date(incident.createdAt).getTime();
        const eventTime = new Date(event.timestamp).getTime();
        incident.correlationTime = Math.round((eventTime - createdTime) / 60000);
      }
    } else if (eventType === 'remediation-started') {
      incident.status = 'remediating';
      if (!incident.commandTime && incident.createdAt) {
        const createdTime = new Date(incident.createdAt).getTime();
        const eventTime = new Date(event.timestamp).getTime();
        incident.commandTime = Math.round((eventTime - createdTime) / 60000);
      }
    } else if (eventType === 'notification-sent') {
      incident.status = 'communicating';
    } else if (eventType === 'resolved') {
      incident.status = 'resolved';
      incident.resolvedAt = event.timestamp;
      if (incident.createdAt) {
        const createdTime = new Date(incident.createdAt).getTime();
        const resolvedTime = new Date(event.timestamp).getTime();
        incident.totalResolutionTime = Math.round((resolvedTime - createdTime) / 60000); // minutes
      }
    }
  }

  return event;
}

/**
 * Create incident record
 */
export function createIncident(
  incidentId: string,
  category: string,
  customerImpact: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): IncidentLifecycleMetrics {
  const incident: IncidentLifecycleMetrics = {
    incidentId,
    category,
    createdAt: new Date().toISOString(),
    status: 'detecting',
    customerImpact,
    events: [],
  };

  incidents.set(incidentId, incident);
  recordIncidentEvent(incidentId, 'created', 'DNS-023', { category, customerImpact });

  return incident;
}

/**
 * Get incident lifecycle metrics
 */
export function getIncident(incidentId: string): IncidentLifecycleMetrics | undefined {
  return incidents.get(incidentId);
}

/**
 * Calculate incident metrics for time period
 */
export function getIncidentMetrics(hours: number = 24): IncidentMetrics {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recentIncidents = Array.from(incidents.values()).filter(
    (i) => new Date(i.createdAt) > cutoff
  );

  const resolved = recentIncidents.filter((i) => i.status === 'resolved' || i.resolvedAt);
  const resolutionTimes = resolved
    .filter((i) => i.totalResolutionTime !== undefined)
    .map((i) => i.totalResolutionTime as number);

  // Calculate percentiles
  const sortedTimes = resolutionTimes.sort((a, b) => a - b);
  const median = sortedTimes[Math.floor(sortedTimes.length / 2)] || 0;
  const p95Index = Math.ceil(sortedTimes.length * 0.95);
  const p99Index = Math.ceil(sortedTimes.length * 0.99);
  const p95 = sortedTimes[p95Index] || 0;
  const p99 = sortedTimes[p99Index] || 0;

  // Calculate average MTTD (mean time to detection)
  const detectionTimes = recentIncidents
    .filter((i) => i.detectionTime !== undefined)
    .map((i) => i.detectionTime as number);
  const avgMTTD = detectionTimes.length > 0 ? detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length : 0;

  // Calculate average MTTR (mean time to resolution)
  const avgMTTR = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

  // Calculate success rate
  const successfulByPlaybook = resolved.filter((i) => i.playbookSuccessful).length;
  const successRate = resolved.length > 0 ? (successfulByPlaybook / resolved.length) * 100 : 0;

  // Calculate playbook effectiveness
  const playbookCategories = new Set(recentIncidents.map((i) => i.category));
  const playbookEffectiveness: Record<string, number> = {};
  for (const category of playbookCategories) {
    const categoryIncidents = recentIncidents.filter((i) => i.category === category);
    const successfulCategory = categoryIncidents.filter((i) => i.playbookSuccessful).length;
    playbookEffectiveness[category] = categoryIncidents.length > 0 ? (successfulCategory / categoryIncidents.length) * 100 : 0;
  }

  // Calculate trend
  const previousCutoff = new Date(cutoff.getTime() - hours * 60 * 60 * 1000);
  const previousIncidents = Array.from(incidents.values()).filter(
    (i) => new Date(i.createdAt) > previousCutoff && new Date(i.createdAt) <= cutoff
  );
  const previousResolved = previousIncidents.filter((i) => i.status === 'resolved' || i.resolvedAt);
  const previousSuccessRate = previousResolved.length > 0
    ? (previousResolved.filter((i) => i.playbookSuccessful).length / previousResolved.length) * 100
    : 0;

  let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
  let trendMagnitude = 0;
  if (successRate > previousSuccessRate + 5) {
    trendDirection = 'improving';
    trendMagnitude = successRate - previousSuccessRate;
  } else if (successRate < previousSuccessRate - 5) {
    trendDirection = 'declining';
    trendMagnitude = previousSuccessRate - successRate;
  }

  return {
    totalIncidents: recentIncidents.length,
    resolvedIncidents: resolved.length,
    unresolvedIncidents: recentIncidents.length - resolved.length,
    averageMTTD: Math.round(avgMTTD * 10) / 10,
    averageMTTR: Math.round(avgMTTR * 10) / 10,
    successRate: Math.round(successRate),
    playbookEffectiveness,
    medianResolutionTime: median,
    p95ResolutionTime: p95,
    p99ResolutionTime: p99,
    trendDirection,
    trendMagnitude,
  };
}

/**
 * Record incident resolution (marks as successful or failed)
 */
export function resolveIncident(
  incidentId: string,
  successful: boolean,
  playbookUsed?: string
): IncidentLifecycleMetrics | undefined {
  const incident = incidents.get(incidentId);
  if (!incident) return undefined;

  incident.playbookSuccessful = successful;
  if (playbookUsed) {
    incident.playbookUsed = playbookUsed;
  }

  recordIncidentEvent(incidentId, 'resolved', 'DNS-023', { successful, playbookUsed });
  return incident;
}

/**
 * Update system health status
 */
export function updateSystemHealth(
  system: keyof Omit<SystemHealthMetrics, 'lastSystemCheck' | 'systemUptime' | 'systemErrors'>,
  healthy: boolean
): void {
  systemHealth[system] = healthy;
  systemHealth.lastSystemCheck = new Date().toISOString();

  if (!healthy) {
    systemHealth.systemErrors++;
  }
}

/**
 * Get system health metrics
 */
export function getSystemHealth(): SystemHealthMetrics {
  const allHealthy =
    systemHealth.detectionSystemHealthy &&
    systemHealth.correlationSystemHealthy &&
    systemHealth.incidentCommandHealthy &&
    systemHealth.communicationSystemHealthy &&
    systemHealth.remediationSystemHealthy &&
    systemHealth.postmortemSystemHealthy;

  return {
    ...systemHealth,
    systemUptime: allHealthy ? 100 : 95,
  };
}

/**
 * Get incident events for specific incident
 */
export function getIncidentEvents(incidentId: string): IncidentEvent[] {
  return incidentEvents.filter((e) => e.incidentId === incidentId);
}

/**
 * Get all incidents
 */
export function getAllIncidents(): IncidentLifecycleMetrics[] {
  return Array.from(incidents.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Reset metrics store (testing/admin only)
 */
export function resetMetricsStore(): void {
  incidents.clear();
  incidentEvents.length = 0;
  systemHealth.detectionSystemHealthy = true;
  systemHealth.correlationSystemHealthy = true;
  systemHealth.incidentCommandHealthy = true;
  systemHealth.communicationSystemHealthy = true;
  systemHealth.remediationSystemHealthy = true;
  systemHealth.postmortemSystemHealthy = true;
  systemHealth.lastSystemCheck = new Date().toISOString();
  systemHealth.systemUptime = 100;
  systemHealth.systemErrors = 0;
}
