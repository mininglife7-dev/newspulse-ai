import fs from 'fs';
import path from 'path';

export interface CostDataPoint {
  provider: 'vercel' | 'supabase';
  date: string;
  amount: number;
  baslineAmount?: number;
  anomalyRatio?: number;
}

export interface CostAnomaly {
  provider: string;
  metric: string;
  currentCost: number;
  baselineCost: number;
  ratio: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface CostAnomalyReport {
  timestamp: string;
  vercel: {
    dailyCost: number | null;
    monthlyProjection: number | null;
    anomalyDetected: boolean;
  };
  supabase: {
    dailyCost: number | null;
    monthlyProjection: number | null;
    anomalyDetected: boolean;
  };
  anomalies: CostAnomaly[];
  summary: string;
}

const HISTORY_DIR = path.join(process.cwd(), '.cost-history');
const VERCEL_API = 'https://api.vercel.com/v3';
const SUPABASE_API = 'https://api.supabase.com/v1';

// Cost baselines (in USD per day for typical app)
const COST_BASELINES = {
  vercel: {
    daily: 0.5, // ~$15/month (typical hobby/starter)
    monthly: 15,
    criticalThreshold: 3.0, // Alert if >$90/month (3x baseline)
    highThreshold: 1.5, // Alert if >$45/month (1.5x baseline)
  },
  supabase: {
    daily: 1.0, // ~$30/month (typical usage)
    monthly: 30,
    criticalThreshold: 4.0, // Alert if >$120/month (4x baseline)
    highThreshold: 2.0, // Alert if >$60/month (2x baseline)
  },
};

/**
 * Fetch Vercel project costs from Vercel API
 * Requires VERCEL_TOKEN env var
 */
async function fetchVercelCosts(): Promise<number | null> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.warn('[cost-anomaly] VERCEL_TOKEN not set, skipping Vercel cost check');
    return null;
  }

  try {
    const response = await fetch(`${VERCEL_API}/billing/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`[cost-anomaly] Vercel API returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { estimatedBilling?: number };
    // Return estimated monthly billing (already in USD)
    return data.estimatedBilling ?? null;
  } catch (error) {
    console.error('[cost-anomaly] Failed to fetch Vercel costs:', error);
    return null;
  }
}

/**
 * Fetch Supabase project costs from Supabase API
 * Requires SUPABASE_API_TOKEN env var and SUPABASE_PROJECT_ID
 */
async function fetchSupabaseCosts(): Promise<number | null> {
  const token = process.env.SUPABASE_API_TOKEN;
  const projectId = process.env.SUPABASE_PROJECT_ID;

  if (!token || !projectId) {
    console.warn(
      '[cost-anomaly] SUPABASE_API_TOKEN or SUPABASE_PROJECT_ID not set, skipping Supabase cost check'
    );
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_API}/projects/${projectId}/billing/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`[cost-anomaly] Supabase API returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { current_estimated_bill?: number };
    return data.current_estimated_bill ?? null;
  } catch (error) {
    console.error('[cost-anomaly] Failed to fetch Supabase costs:', error);
    return null;
  }
}

/**
 * Load cost history from filesystem
 */
function loadCostHistory(provider: 'vercel' | 'supabase'): CostDataPoint[] {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
      return [];
    }

    const file = path.join(HISTORY_DIR, `${provider}-history.json`);
    if (!fs.existsSync(file)) {
      return [];
    }

    const data = fs.readFileSync(file, 'utf-8');
    return JSON.parse(data) as CostDataPoint[];
  } catch (error) {
    console.error(`[cost-anomaly] Failed to load ${provider} cost history:`, error);
    return [];
  }
}

/**
 * Save cost history to filesystem
 */
function saveCostHistory(provider: 'vercel' | 'supabase', history: CostDataPoint[]): void {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    const file = path.join(HISTORY_DIR, `${provider}-history.json`);
    // Keep only last 90 days
    const recentHistory = history.slice(-90);
    fs.writeFileSync(file, JSON.stringify(recentHistory, null, 2));
  } catch (error) {
    console.error(`[cost-anomaly] Failed to save ${provider} cost history:`, error);
  }
}

/**
 * Calculate average cost over a rolling window
 */
function calculateRollingAverage(dataPoints: CostDataPoint[], windowDays: number = 30): number {
  if (dataPoints.length === 0) {
    return 0;
  }

  const recentPoints = dataPoints.slice(-windowDays);
  const sum = recentPoints.reduce((acc, p) => acc + p.amount, 0);
  return sum / recentPoints.length;
}

/**
 * Detect cost anomalies for a provider
 */
function detectAnomalies(
  provider: 'vercel' | 'supabase',
  currentCost: number | null,
  history: CostDataPoint[]
): CostAnomaly[] {
  if (currentCost === null || currentCost === 0) {
    return [];
  }

  const baselines = COST_BASELINES[provider];
  const rollingAverage = calculateRollingAverage(history, 30);
  const baseline = rollingAverage > 0 ? rollingAverage : baselines.daily * 30;

  const ratio = currentCost / baseline;
  const anomalies: CostAnomaly[] = [];

  if (ratio >= baselines.criticalThreshold) {
    anomalies.push({
      provider,
      metric: 'monthly_cost',
      currentCost,
      baselineCost: baseline,
      ratio,
      severity: 'critical',
      message: `${provider} costs are ${(ratio * 100).toFixed(0)}% of baseline ($${currentCost.toFixed(2)}/mo vs $${baseline.toFixed(2)}/mo baseline)`,
    });
  } else if (ratio >= baselines.highThreshold) {
    anomalies.push({
      provider,
      metric: 'monthly_cost',
      currentCost,
      baselineCost: baseline,
      ratio,
      severity: 'high',
      message: `${provider} costs elevated to ${(ratio * 100).toFixed(0)}% of baseline ($${currentCost.toFixed(2)}/mo vs $${baseline.toFixed(2)}/mo baseline)`,
    });
  }

  return anomalies;
}

/**
 * Main detection routine: fetch costs, detect anomalies, update history
 */
export async function detectCostAnomalies(): Promise<CostAnomalyReport> {
  const timestamp = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  // Fetch current costs
  const vercelCost = await fetchVercelCosts();
  const supabaseCost = await fetchSupabaseCosts();

  // Load history
  const vercelHistory = loadCostHistory('vercel');
  const supabaseHistory = loadCostHistory('supabase');

  // Detect anomalies BEFORE updating history (so we compare against baseline, not today's cost)
  const vercelAnomalies = detectAnomalies('vercel', vercelCost, vercelHistory);
  const supabaseAnomalies = detectAnomalies('supabase', supabaseCost, supabaseHistory);

  // Update history if we have new data
  if (vercelCost !== null && (!vercelHistory.length || vercelHistory[vercelHistory.length - 1].date !== today)) {
    vercelHistory.push({ provider: 'vercel', date: today, amount: vercelCost });
    saveCostHistory('vercel', vercelHistory);
  }

  if (supabaseCost !== null && (!supabaseHistory.length || supabaseHistory[supabaseHistory.length - 1].date !== today)) {
    supabaseHistory.push({ provider: 'supabase', date: today, amount: supabaseCost });
    saveCostHistory('supabase', supabaseHistory);
  }
  const allAnomalies = [...vercelAnomalies, ...supabaseAnomalies];

  // Calculate monthly projections (if we have weekly data)
  const vercelMonthlyProjection = vercelCost ? vercelCost : null;
  const supabaseMonthlyProjection = supabaseCost ? supabaseCost : null;

  const summary =
    allAnomalies.length === 0
      ? 'No cost anomalies detected'
      : `${allAnomalies.length} cost anomaly(ies) detected`;

  return {
    timestamp,
    vercel: {
      dailyCost: vercelCost ? vercelCost / 30 : null, // Convert monthly to daily
      monthlyProjection: vercelMonthlyProjection,
      anomalyDetected: vercelAnomalies.length > 0,
    },
    supabase: {
      dailyCost: supabaseCost ? supabaseCost / 30 : null,
      monthlyProjection: supabaseMonthlyProjection,
      anomalyDetected: supabaseAnomalies.length > 0,
    },
    anomalies: allAnomalies,
    summary,
  };
}

/**
 * Convert cost anomalies to alert format (for DNA-005 integration)
 */
export function anomaliesToAlerts(
  report: CostAnomalyReport
): Array<{
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  timestamp: string;
  source: string;
}> {
  return report.anomalies.map((anomaly, idx) => ({
    id: `dna-011-${anomaly.provider}-${anomaly.metric}-${Date.now()}-${idx}`,
    severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
    category: 'cost',
    title: `Cost anomaly: ${anomaly.provider.charAt(0).toUpperCase() + anomaly.provider.slice(1)}`,
    message: anomaly.message,
    timestamp: report.timestamp,
    source: 'DNA-GOV-011',
  }));
}
