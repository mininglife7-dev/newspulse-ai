/**
 * Google Cloud AI System Auto-Discovery
 * Scans GCP project for AI/ML services:
 * - Vertex AI workspaces, models, endpoints
 * - Cloud AI Platform (legacy & unified)
 * - BigQuery ML models
 * - Cloud Run services with AI frameworks
 * - Cloud Functions with ML workloads
 */

export interface GcpAISystemDetection {
  id: string; // GCP resource name/ID
  name: string;
  description?: string;
  url: string; // GCP Console URL
  serviceType: string; // vertex-ai, bq-ml, cloud-run, cloud-function, etc.
  region: string;
  detectedPatterns: string[];
  confidence: number; // 0-100
  lastUpdated: string; // ISO timestamp
  metadata: Record<string, any>;
}

export interface GcpDiscoveryConfig {
  projectId: string;
  credentials?: Record<string, any>; // Service account JSON
  regions?: string[]; // default: all regions
}

const AI_INDICATORS = {
  services: [
    'aiplatform',
    'ml',
    'bigquery',
    'automl',
    'vertex',
    'vision',
    'language',
    'speech',
    'translate',
    'dialogflow',
    'recommendation',
  ],
  keywords: [
    'ml',
    'ai',
    'model',
    'inference',
    'training',
    'endpoint',
    'tensor',
    'bert',
    'gpt',
    'llm',
    'prediction',
  ],
};

function scoreGcpResource(resource: any): { score: number; patterns: string[] } {
  const patterns: string[] = [];
  let score = 0;

  const name = (resource.name || '').toLowerCase();
  const displayName = (resource.displayName || '').toLowerCase();
  const labels = resource.labels || {};

  // Vertex AI detection (strongest)
  if (name.includes('aiplatform') || name.includes('vertex')) {
    score += 50;
    patterns.push('Google Cloud Vertex AI detected (unified ML platform)');

    if (resource.state === 'DEPLOYED' || resource.deploymentState === 'DEPLOYED') {
      score += 15;
      patterns.push('Model deployed in production');
    }

    if (resource.modelType) {
      score += 10;
      patterns.push(`Model type: ${resource.modelType}`);
    }
  }

  // BigQuery ML
  if (name.includes('bigquery') && (displayName.includes('model') || displayName.includes('ml'))) {
    score += 35;
    patterns.push('BigQuery ML model (machine learning on data warehouse)');

    if (resource.modelType) {
      score += 10;
      patterns.push(`BigQuery model: ${resource.modelType}`);
    }
  }

  // Cloud Run with AI workload
  if (name.includes('run') || name.includes('cloudrun')) {
    const imageUri = resource.template?.spec?.containers?.[0]?.image || '';
    const matchingKeywords = AI_INDICATORS.keywords.filter((k) =>
      imageUri.toLowerCase().includes(k)
    );

    if (matchingKeywords.length > 0) {
      score += 30;
      patterns.push(
        `Cloud Run service with AI framework: ${matchingKeywords.slice(0, 2).join(', ')}`
      );
    }
  }

  // Cloud Functions
  if (name.includes('cloudfunctions') || name.includes('function')) {
    const runtime = resource.runtime || '';
    const sourceCode = resource.sourceArchiveUrl || resource.sourceRepository || '';

    const matchingKeywords = AI_INDICATORS.keywords.filter((k) =>
      (runtime + sourceCode).toLowerCase().includes(k)
    );

    if (matchingKeywords.length > 0) {
      score += 25;
      patterns.push(
        `Cloud Function with ML libraries: ${matchingKeywords.slice(0, 2).join(', ')}`
      );
    }
  }

  // AI/ML specific services
  const matchingServices = AI_INDICATORS.services.filter((s) =>
    name.toLowerCase().includes(s)
  );
  if (matchingServices.length > 0) {
    score += 20;
    patterns.push(`GCP AI service: ${matchingServices[0]}`);
  }

  // Keywords in name/display name
  const fullName = `${name} ${displayName}`;
  const matchingKeywords = AI_INDICATORS.keywords.filter((k) =>
    fullName.includes(k)
  );
  if (matchingKeywords.length > 0) {
    score += 8 * matchingKeywords.length;
    patterns.push(`Resource name indicates AI: ${matchingKeywords.slice(0, 3).join(', ')}`);
  }

  // Labels
  const labelStr = Object.entries(labels || {})
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
    .toLowerCase();
  const matchingLabels = AI_INDICATORS.keywords.filter((k) => labelStr.includes(k));
  if (matchingLabels.length > 0) {
    score += 10;
    patterns.push(`Labels indicate AI: ${matchingLabels.slice(0, 2).join(', ')}`);
  }

  // Recent activity
  if (resource.updateTime) {
    const lastUpdated = new Date(resource.updateTime);
    const daysSinceUpdate = Math.floor(
      (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate < 7) {
      score += 10;
      patterns.push('Recently updated (active usage)');
    }
  }

  return { score: Math.min(100, Math.max(0, score)), patterns };
}

// Placeholder: GCP discovery implementation requires Google Cloud SDK authentication
// This module is a schema for future implementation when GCP credentials are available

/**
 * Full GCP discovery flow
 */
export async function discoverGcpAISystems(
  config: GcpDiscoveryConfig
): Promise<GcpAISystemDetection[]> {
  // Placeholder implementation
  // In production, this would use Google Cloud SDK

  if (!config.projectId) {
    throw new Error('GCP projectId is required');
  }

  const allDetections: GcpAISystemDetection[] = [];

  // This is a schema placeholder - actual implementation requires:
  // 1. GCP authentication (service account or ADC)
  // 2. Multiple regional queries (Vertex AI is regional)
  // 3. Proper permission handling
  // 4. BigQuery ML model discovery
  // 5. Cloud Run/Functions scanning for ML workloads

  return allDetections;
}
