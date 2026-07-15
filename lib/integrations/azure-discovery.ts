/**
 * Azure AI System Auto-Discovery
 * Scans Azure subscription for AI/ML services:
 * - Azure Machine Learning workspaces, jobs, endpoints
 * - Cognitive Services (Vision, Language, Speech, Decision)
 * - OpenAI Service resources
 * - Azure AI Search
 * - Function Apps with AI frameworks
 */

export interface AzureAISystemDetection {
  id: string; // Azure resource ID
  name: string;
  description?: string;
  url: string; // Azure Portal URL
  resourceType: string; // MachineLearning, CognitiveServices, OpenAI, etc.
  region: string;
  detectedPatterns: string[];
  confidence: number; // 0-100
  lastUpdated: string; // ISO timestamp
  metadata: Record<string, any>;
}

export interface AzureDiscoveryConfig {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

const AI_INDICATORS = {
  resourceTypes: [
    'Microsoft.MachineLearningServices',
    'Microsoft.CognitiveServices',
    'Microsoft.OpenAI',
    'Microsoft.Search',
    'Microsoft.ContainerRegistry',
  ],
  cognitiveServices: [
    'ComputerVision',
    'TextAnalytics',
    'LanguageUnderstanding',
    'SpeechServices',
    'AnomalyDetector',
  ],
  keywords: [
    'ml',
    'ai',
    'machine-learning',
    'model',
    'training',
    'endpoint',
    'inference',
    'bert',
    'gpt',
    'llm',
  ],
};

function scoreAzureResource(resource: any): { score: number; patterns: string[] } {
  const patterns: string[] = [];
  let score = 0;

  const name = (resource.name || '').toLowerCase();
  const type = (resource.type || '').toLowerCase();
  const kind = (resource.kind || '').toLowerCase();
  const tags = resource.tags || {};

  // Machine Learning workspace (strongest indicator)
  if (type.includes('machinelearning')) {
    score += 45;
    patterns.push('Azure Machine Learning workspace detected');

    if (resource.properties?.computeInstances?.length > 0) {
      score += 15;
      patterns.push(`${resource.properties.computeInstances.length} compute instances`);
    }
  }

  // Azure OpenAI Service
  if (type.includes('openai') || kind.includes('openai')) {
    score += 60;
    patterns.push('Azure OpenAI Service (generative AI platform)');
  }

  // Cognitive Services
  if (type.includes('cognitiveservices')) {
    score += 35;

    const matchingServices = AI_INDICATORS.cognitiveServices.filter((s) =>
      kind.toLowerCase().includes(s.toLowerCase())
    );
    if (matchingServices.length > 0) {
      score += 15;
      patterns.push(`Cognitive Service: ${matchingServices[0]}`);
    }

    patterns.push('Azure Cognitive Services (AI services)');
  }

  // Azure AI Search
  if (type.includes('search') && (kind.includes('search') || name.includes('search'))) {
    score += 30;
    patterns.push('Azure AI Search (semantic search & RAG)');
  }

  // Keywords in name
  const matchingKeywords = AI_INDICATORS.keywords.filter((k) =>
    name.includes(k)
  );
  if (matchingKeywords.length > 0) {
    score += 10 * matchingKeywords.length;
    patterns.push(`Resource name suggests AI: ${matchingKeywords.slice(0, 2).join(', ')}`);
  }

  // Check tags
  const tagStr = Object.entries(tags || {})
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')
    .toLowerCase();
  const matchingTags = AI_INDICATORS.keywords.filter((k) => tagStr.includes(k));
  if (matchingTags.length > 0) {
    score += 10;
    patterns.push(`Tags indicate AI usage: ${matchingTags.slice(0, 2).join(', ')}`);
  }

  // Recent activity
  if (resource.properties?.lastModified || resource.createdAt) {
    const lastModified = new Date(resource.properties?.lastModified || resource.createdAt);
    const daysSinceUpdate = Math.floor((Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate < 7) {
      score += 10;
      patterns.push('Recently updated (active usage)');
    }
  }

  return { score: Math.min(100, Math.max(0, score)), patterns };
}

// Placeholder: Azure discovery implementation requires Azure SDK authentication
// This module is a schema for future implementation when Azure credentials are available

/**
 * Full Azure discovery flow
 */
export async function discoverAzureAISystems(
  config: AzureDiscoveryConfig
): Promise<AzureAISystemDetection[]> {
  // Placeholder implementation
  // In production, this would use Azure SDK for authentication and resource discovery

  if (
    !config.subscriptionId ||
    !config.tenantId ||
    !config.clientId ||
    !config.clientSecret
  ) {
    throw new Error('Azure credentials required for discovery');
  }

  const allDetections: AzureAISystemDetection[] = [];

  // This is a schema placeholder - actual implementation requires:
  // 1. Azure SDK authentication via service principal
  // 2. Resource Graph API for efficient discovery
  // 3. Support for multiple subscriptions
  // 4. Proper error handling and retry logic

  return allDetections;
}
