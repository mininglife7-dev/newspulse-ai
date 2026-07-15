/**
 * DNS-GOV-018: Customer Intelligence & Autonomous Retention
 *
 * Enable autonomous customer retention through behavioral segmentation, health scoring,
 * churn prediction, and trigger-based recommendations. Identify at-risk customers,
 * recommend interventions, and track retention metrics.
 *
 * Problem: Cannot identify customers at risk of churn until they cancel. No automated
 * recommendations for retention actions. Product gaps unknown until after customer leaves.
 * Need: Health scoring, churn prediction, segment targeting, automated trigger engine,
 * customer success playbooks.
 */

export type SegmentName =
  | 'champions'
  | 'loyal-customers'
  | 'at-risk'
  | 'churn-warning'
  | 'dormant'
  | 'new-users'
  | 'power-users'
  | 'casual-users';

export type TriggerType =
  | 'welcome'
  | 'feature-education'
  | 're-engagement'
  | 'upgrade-opportunity'
  | 'churn-warning'
  | 'renewal-reminder'
  | 'expansion-opportunity'
  | 'customer-success-review';

export interface CustomerMetrics {
  userId: string;
  lastActivityAt: string;
  totalSessions: number;
  totalEvents: number;
  uniqueFeaturesUsed: number;
  searchesPerformed: number;
  articlesRead: number;
  conversionsCount: number;
  daysSinceLastActivity: number;
  accountAgeInDays: number;
  loginFrequency: number; // logins per week
}

export interface HealthScore {
  userId: string;
  score: number; // 0-100
  engagementScore: number; // 0-100
  usageScore: number; // 0-100
  conversionScore: number; // 0-100
  activityScore: number; // 0-100
  accountAgeInDays: number;
  category: 'healthy' | 'at-risk' | 'at-critical-risk';
  lastUpdated: string;
  trends: {
    engagement: 'improving' | 'stable' | 'declining';
    usage: 'increasing' | 'stable' | 'decreasing';
    activity: 'increasing' | 'stable' | 'decreasing';
  };
}

export interface RiskScore {
  userId: string;
  score: number; // 0-100 (higher = riskier)
  churnProbability: number; // 0-1
  inactivityRisk: 'low' | 'medium' | 'high' | 'critical';
  featureAdoptionRisk: 'low' | 'medium' | 'high';
  conversionRisk: 'low' | 'medium' | 'high';
  factors: {
    daysSinceLastActivity: number;
    declinedEngagement: boolean;
    lowFeatureAdoption: boolean;
    noConversions: boolean;
    shortAccountAge: boolean;
  };
  lastUpdated: string;
}

export interface CustomerSegment {
  userId: string;
  segment: SegmentName;
  reason: string;
  confidence: number; // 0-1
  lastUpdated: string;
}

export interface TriggerRecommendation {
  userId: string;
  type: TriggerType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  suggestedAction: string;
  estimatedImpact: string;
  expiresAt: string;
  cooldownUntil?: string;
}

export interface RetentionMetrics {
  timestamp: string;
  totalCustomers: number;
  healthyCustomers: number;
  atRiskCustomers: number;
  criticalRiskCustomers: number;
  avgHealthScore: number;
  avgRiskScore: number;
  churnRisk: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  segmentCounts: Record<SegmentName, number>;
}

interface CustomerDataStore {
  metrics: Map<string, CustomerMetrics>;
  healthScores: Map<string, HealthScore>;
  riskScores: Map<string, RiskScore>;
  segments: Map<string, CustomerSegment>;
  triggers: Map<string, TriggerRecommendation[]>;
  triggerHistory: Array<{
    userId: string;
    type: TriggerType;
    triggeredAt: string;
  }>;
  retentionMetrics: RetentionMetrics[];
}

// In-memory customer retention state
const customerStore: CustomerDataStore = {
  metrics: new Map(),
  healthScores: new Map(),
  riskScores: new Map(),
  segments: new Map(),
  triggers: new Map(),
  triggerHistory: [],
  retentionMetrics: [],
};

/**
 * Update customer metrics
 */
export function updateCustomerMetrics(
  userId: string,
  metrics: Partial<CustomerMetrics>
): CustomerMetrics {
  const existing = customerStore.metrics.get(userId) || {
    userId,
    lastActivityAt: new Date().toISOString(),
    totalSessions: 0,
    totalEvents: 0,
    uniqueFeaturesUsed: 0,
    searchesPerformed: 0,
    articlesRead: 0,
    conversionsCount: 0,
    daysSinceLastActivity: 0,
    accountAgeInDays: 30,
    loginFrequency: 0,
  };

  const updated: CustomerMetrics = { ...existing, ...metrics, userId };
  customerStore.metrics.set(userId, updated);
  return updated;
}

/**
 * Calculate health score (0-100)
 */
export function calculateHealthScore(userId: string): HealthScore {
  const metrics = customerStore.metrics.get(userId);
  if (!metrics) {
    return {
      userId,
      score: 0,
      engagementScore: 0,
      usageScore: 0,
      conversionScore: 0,
      activityScore: 0,
      accountAgeInDays: 30,
      category: 'at-critical-risk',
      lastUpdated: new Date().toISOString(),
      trends: {
        engagement: 'declining',
        usage: 'decreasing',
        activity: 'decreasing',
      },
    };
  }

  // Engagement score: based on login frequency and session count
  const engagementScore = Math.min(
    100,
    Math.max(
      0,
      metrics.loginFrequency * 20 + (metrics.totalSessions > 5 ? 20 : 0)
    )
  );

  // Usage score: based on feature adoption and event volume
  const usageScore = Math.min(
    100,
    Math.max(
      0,
      metrics.uniqueFeaturesUsed * 15 + (metrics.totalEvents > 20 ? 20 : 0)
    )
  );

  // Conversion score: based on conversion history and account maturity
  const conversionScore =
    metrics.conversionsCount > 0 ? 70 : metrics.accountAgeInDays > 60 ? 20 : 45;

  // Activity score: based on recency (0 days recent = 100, 100+ days = 0)
  const activityScore = Math.min(
    100,
    Math.max(0, 100 - metrics.daysSinceLastActivity)
  );

  // Overall health score (weighted average) - activity weighted more heavily
  const score = Math.round(
    engagementScore * 0.15 +
      usageScore * 0.15 +
      conversionScore * 0.2 +
      activityScore * 0.5
  );

  // Determine trends
  const previousHealth = customerStore.healthScores.get(userId);
  let engagementTrend: 'improving' | 'stable' | 'declining' = 'stable';
  let usageTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  let activityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';

  if (previousHealth) {
    if (engagementScore > previousHealth.engagementScore)
      engagementTrend = 'improving';
    else if (engagementScore < previousHealth.engagementScore)
      engagementTrend = 'declining';

    if (usageScore > previousHealth.usageScore) usageTrend = 'increasing';
    else if (usageScore < previousHealth.usageScore) usageTrend = 'decreasing';

    if (activityScore > previousHealth.activityScore)
      activityTrend = 'increasing';
    else if (activityScore < previousHealth.activityScore)
      activityTrend = 'decreasing';
  }

  const category: 'healthy' | 'at-risk' | 'at-critical-risk' =
    score >= 70 ? 'healthy' : score >= 40 ? 'at-risk' : 'at-critical-risk';

  const health: HealthScore = {
    userId,
    score,
    engagementScore,
    usageScore,
    conversionScore,
    activityScore,
    accountAgeInDays: metrics.accountAgeInDays,
    category,
    lastUpdated: new Date().toISOString(),
    trends: {
      engagement: engagementTrend,
      usage: usageTrend,
      activity: activityTrend,
    },
  };

  customerStore.healthScores.set(userId, health);
  return health;
}

/**
 * Calculate risk score (0-100, higher = riskier)
 */
export function calculateRiskScore(userId: string): RiskScore {
  const metrics = customerStore.metrics.get(userId);
  if (!metrics) {
    return {
      userId,
      score: 100,
      churnProbability: 0.9,
      inactivityRisk: 'critical',
      featureAdoptionRisk: 'high',
      conversionRisk: 'high',
      factors: {
        daysSinceLastActivity: 999,
        declinedEngagement: true,
        lowFeatureAdoption: true,
        noConversions: true,
        shortAccountAge: true,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  let score = 0;

  // Inactivity risk (biggest factor)
  let inactivityRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (metrics.daysSinceLastActivity >= 60) {
    score += 45;
    inactivityRisk = 'critical';
  } else if (metrics.daysSinceLastActivity > 30) {
    score += 29;
    inactivityRisk = 'high';
  } else if (metrics.daysSinceLastActivity > 14) {
    score += 14;
    inactivityRisk = 'medium';
  }

  // Feature adoption risk
  let featureAdoptionRisk: 'low' | 'medium' | 'high' = 'low';
  if (metrics.uniqueFeaturesUsed < 2) {
    score += 18;
    featureAdoptionRisk = 'high';
  } else if (metrics.uniqueFeaturesUsed < 4) {
    score += 12;
    featureAdoptionRisk = 'medium';
  }

  // Conversion risk
  let conversionRisk: 'low' | 'medium' | 'high' = 'low';
  if (metrics.conversionsCount === 0 && metrics.accountAgeInDays > 45) {
    score += 18;
    conversionRisk = 'high';
  } else if (metrics.conversionsCount === 0 && metrics.accountAgeInDays > 21) {
    score += 10;
    conversionRisk = 'medium';
  }

  // New account factor (small risk adjustment)
  const isNewAccount = metrics.accountAgeInDays < 7;
  const hasDeclinedEngagement = metrics.loginFrequency < 1;

  if (hasDeclinedEngagement) {
    score += 12;
  }

  // Cap at 100
  score = Math.min(100, score);

  // Calculate churn probability (rough estimate based on score)
  const churnProbability = score / 100;

  const risk: RiskScore = {
    userId,
    score,
    churnProbability,
    inactivityRisk,
    featureAdoptionRisk,
    conversionRisk,
    factors: {
      daysSinceLastActivity: metrics.daysSinceLastActivity,
      declinedEngagement: hasDeclinedEngagement,
      lowFeatureAdoption: metrics.uniqueFeaturesUsed < 3,
      noConversions: metrics.conversionsCount === 0,
      shortAccountAge: isNewAccount,
    },
    lastUpdated: new Date().toISOString(),
  };

  customerStore.riskScores.set(userId, risk);
  return risk;
}

/**
 * Segment customer based on health and risk scores
 */
export function segmentCustomer(userId: string): CustomerSegment {
  const health = calculateHealthScore(userId);
  const risk = calculateRiskScore(userId);
  const metrics = customerStore.metrics.get(userId);

  let segment: SegmentName;
  let reason: string;
  let confidence = 0.8;

  // Check conditions in priority order (most specific/actionable first)
  if (health.accountAgeInDays < 14) {
    segment = 'new-users';
    reason = 'Recently signed up, still in onboarding phase';
  } else if (risk.factors.daysSinceLastActivity >= 100 && health.score < 25) {
    segment = 'dormant';
    reason = 'Inactive account, no recent engagement';
  } else if (risk.score >= 70 && risk.churnProbability > 0.6) {
    segment = 'churn-warning';
    reason = 'Critical risk factors detected, high churn probability';
  } else if (health.score >= 35 && risk.score >= 40 && risk.score < 70) {
    segment = 'at-risk';
    reason = 'Declining engagement or usage patterns';
  } else if (
    health.usageScore >= 80 &&
    health.score >= 75 &&
    metrics &&
    metrics.conversionsCount < 3
  ) {
    segment = 'power-users';
    reason = 'High feature adoption and consistent usage';
  } else if (health.score >= 85 && risk.score < 20) {
    segment = 'champions';
    reason = 'Highly engaged, healthy account, low churn risk';
  } else if (health.score >= 70 && risk.score < 40) {
    segment = 'loyal-customers';
    reason = 'Consistent engagement, stable usage';
  } else {
    segment = 'casual-users';
    reason = 'Moderate engagement, occasional usage';
  }

  const customerSegment: CustomerSegment = {
    userId,
    segment,
    reason,
    confidence,
    lastUpdated: new Date().toISOString(),
  };

  customerStore.segments.set(userId, customerSegment);
  return customerSegment;
}

/**
 * Generate retention trigger recommendations
 */
export function generateTriggers(userId: string): TriggerRecommendation[] {
  const triggers: TriggerRecommendation[] = [];
  const health = calculateHealthScore(userId);
  const risk = calculateRiskScore(userId);
  const segment = segmentCustomer(userId);
  const metrics = customerStore.metrics.get(userId);

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString(); // 7 days

  // New user welcome workflow
  if (segment.segment === 'new-users') {
    triggers.push({
      userId,
      type: 'welcome',
      priority: 'high',
      reason: 'New user onboarding',
      suggestedAction: 'Send welcome email series with feature guides',
      estimatedImpact: 'Increases engagement in first 30 days by 25%',
      expiresAt,
    });
  }

  // Feature education for low adoption
  if (
    risk.featureAdoptionRisk === 'high' &&
    metrics &&
    metrics.uniqueFeaturesUsed < 3
  ) {
    triggers.push({
      userId,
      type: 'feature-education',
      priority: 'high',
      reason: `Low feature adoption: only ${metrics.uniqueFeaturesUsed} features used`,
      suggestedAction:
        'Send feature education email highlighting top 3 unused features',
      estimatedImpact: 'Increases feature adoption by 40%',
      expiresAt,
    });
  }

  // Re-engagement for inactive users
  if (
    risk.inactivityRisk === 'high' &&
    metrics &&
    metrics.daysSinceLastActivity > 30
  ) {
    triggers.push({
      userId,
      type: 're-engagement',
      priority: 'high',
      reason: `No activity for ${metrics.daysSinceLastActivity} days`,
      suggestedAction:
        'Send re-engagement email with value props and incentives',
      estimatedImpact: 'Brings back 20-30% of inactive users',
      expiresAt,
    });
  }

  // Critical churn warning
  if (segment.segment === 'churn-warning') {
    triggers.push({
      userId,
      type: 'churn-warning',
      priority: 'critical',
      reason: `High churn risk: ${risk.score}/100 risk score`,
      suggestedAction: 'Customer success team should reach out immediately',
      estimatedImpact: 'Prevents 30-40% of predicted churners',
      expiresAt,
      cooldownUntil: new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(), // 3 days
    });
  }

  // Upgrade opportunity
  if (
    segment.segment === 'power-users' &&
    metrics &&
    metrics.conversionsCount > 0
  ) {
    triggers.push({
      userId,
      type: 'upgrade-opportunity',
      priority: 'medium',
      reason: 'Power user with high engagement ready for premium tier',
      suggestedAction: 'Recommend premium features aligned with usage patterns',
      estimatedImpact: 'Increases ARPU by 15-20%',
      expiresAt,
    });
  }

  // Renewal reminder
  if (segment.segment === 'loyal-customers') {
    triggers.push({
      userId,
      type: 'renewal-reminder',
      priority: 'medium',
      reason: 'Stable customer approaching potential renewal window',
      suggestedAction: 'Send renewal notice with success metrics',
      estimatedImpact: 'Increases retention rate by 10-15%',
      expiresAt,
    });
  }

  // Expansion opportunity
  if (health.score >= 60 && health.usageScore >= 60) {
    triggers.push({
      userId,
      type: 'expansion-opportunity',
      priority: 'low',
      reason: 'Customer demonstrating strong product fit',
      suggestedAction: 'Suggest complementary features or use cases',
      estimatedImpact: 'Increases product adoption breadth',
      expiresAt,
    });
  }

  // Store triggers
  customerStore.triggers.set(userId, triggers);

  // Record trigger history
  triggers.forEach((t) => {
    customerStore.triggerHistory.push({
      userId,
      type: t.type,
      triggeredAt: new Date().toISOString(),
    });
  });

  return triggers;
}

/**
 * Get customer health overview
 */
export function getCustomerHealth(userId: string) {
  const metrics = customerStore.metrics.get(userId);
  const health = calculateHealthScore(userId);
  const risk = calculateRiskScore(userId);
  const segment = segmentCustomer(userId);
  const triggers = customerStore.triggers.get(userId) || [];

  return {
    userId,
    metrics,
    health,
    risk,
    segment,
    activeTriggers: triggers.filter((t) => new Date(t.expiresAt) > new Date()),
  };
}

/**
 * Calculate retention metrics
 */
export function calculateRetentionMetrics(): RetentionMetrics {
  const healthScores = Array.from(customerStore.healthScores.values());
  const riskScores = Array.from(customerStore.riskScores.values());
  const segments = Array.from(customerStore.segments.values());

  const metrics: RetentionMetrics = {
    timestamp: new Date().toISOString(),
    totalCustomers: Math.max(
      healthScores.length,
      riskScores.length,
      segments.length
    ),
    healthyCustomers: healthScores.filter((h) => h.category === 'healthy')
      .length,
    atRiskCustomers: healthScores.filter((h) => h.category === 'at-risk')
      .length,
    criticalRiskCustomers: healthScores.filter(
      (h) => h.category === 'at-critical-risk'
    ).length,
    avgHealthScore:
      healthScores.length > 0
        ? Math.round(
            healthScores.reduce((a, h) => a + h.score, 0) / healthScores.length
          )
        : 0,
    avgRiskScore:
      riskScores.length > 0
        ? Math.round(
            riskScores.reduce((a, r) => a + r.score, 0) / riskScores.length
          )
        : 0,
    churnRisk: {
      low: riskScores.filter((r) => r.churnProbability < 0.25).length,
      medium: riskScores.filter(
        (r) => r.churnProbability >= 0.25 && r.churnProbability < 0.6
      ).length,
      high: riskScores.filter(
        (r) => r.churnProbability >= 0.6 && r.churnProbability < 0.8
      ).length,
      critical: riskScores.filter((r) => r.churnProbability >= 0.8).length,
    },
    segmentCounts: {
      champions: segments.filter((s) => s.segment === 'champions').length,
      'loyal-customers': segments.filter((s) => s.segment === 'loyal-customers')
        .length,
      'at-risk': segments.filter((s) => s.segment === 'at-risk').length,
      'churn-warning': segments.filter((s) => s.segment === 'churn-warning')
        .length,
      dormant: segments.filter((s) => s.segment === 'dormant').length,
      'new-users': segments.filter((s) => s.segment === 'new-users').length,
      'power-users': segments.filter((s) => s.segment === 'power-users').length,
      'casual-users': segments.filter((s) => s.segment === 'casual-users')
        .length,
    },
  };

  customerStore.retentionMetrics.push(metrics);

  // Keep bounded at 1000
  if (customerStore.retentionMetrics.length > 1000) {
    customerStore.retentionMetrics.shift();
  }

  return metrics;
}

/**
 * Get customers by segment
 */
export function getCustomersBySegment(segment: SegmentName): CustomerSegment[] {
  return Array.from(customerStore.segments.values()).filter(
    (s) => s.segment === segment
  );
}

/**
 * Get high-risk customers needing attention
 */
export function getHighRiskCustomers(
  limit = 50
): Array<{
  userId: string;
  risk: RiskScore;
  triggers: TriggerRecommendation[];
}> {
  const riskScores = Array.from(customerStore.riskScores.values())
    .filter((r) => r.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return riskScores.map((risk) => ({
    userId: risk.userId,
    risk,
    triggers: customerStore.triggers.get(risk.userId) || [],
  }));
}

/**
 * Format retention status for display
 */
export function formatRetentionStatus(): string {
  const metrics = calculateRetentionMetrics();
  const churnRiskTotal = metrics.churnRisk.high + metrics.churnRisk.critical;

  let status = `👥 Retention Engine | ${metrics.totalCustomers} customers`;
  status += ` | Health: ${metrics.avgHealthScore}/100`;
  status += ` | At-risk: ${metrics.atRiskCustomers} | Critical: ${metrics.criticalRiskCustomers}`;
  status += ` | High-risk churn: ${churnRiskTotal}`;

  return status;
}

/**
 * Reset customer retention state (testing)
 */
export function resetCustomerRetention(): void {
  customerStore.metrics.clear();
  customerStore.healthScores.clear();
  customerStore.riskScores.clear();
  customerStore.segments.clear();
  customerStore.triggers.clear();
  customerStore.triggerHistory = [];
  customerStore.retentionMetrics = [];
}
