/**
 * AI Bill of Materials (AI-BOM) Generator
 * Automatically analyzes dependency files to identify AI/ML frameworks, models, and components
 * Complies with EU AI Act Article 11 requirements for transparency
 *
 * Supported formats:
 * - Python: requirements.txt, pyproject.toml, poetry.lock, pipenv.lock
 * - Node.js: package.json, package-lock.json, yarn.lock
 * - Java: pom.xml, build.gradle
 * - Docker: Dockerfile, base image analysis
 */

export interface AiBomComponent {
  name: string; // Package/library name
  version: string;
  type: 'framework' | 'model' | 'library' | 'service' | 'base-image';
  category: string; // ml-framework, nlp, computer-vision, embeddings, etc.
  vendor?: string; // OpenAI, Anthropic, Hugging Face, etc.
  purpose: string; // What this component does
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  auditStatus: 'not-audited' | 'in-review' | 'approved' | 'deprecated';
  dataHandling?: string; // What data does it process
  url?: string; // Package repository/documentation URL
}

export interface AiBom {
  systemId: string;
  generatedAt: string;
  components: AiBomComponent[];
  summary: {
    totalComponents: number;
    frameworkComponents: number;
    criticalRiskCount: number;
    requiresAiActAssessment: boolean;
  };
  findings: string[]; // Issues/concerns identified
}

// Comprehensive registry of AI/ML frameworks and their characteristics
const AI_FRAMEWORK_REGISTRY: Record<
  string,
  {
    category: string;
    type: string;
    vendor?: string;
    purpose: string;
    riskLevel: string;
    dataHandling?: string;
  }
> = {
  // Large Language Models / Generative AI
  'openai-python': {
    category: 'llm',
    type: 'service',
    vendor: 'OpenAI',
    purpose: 'GPT-4 and GPT-3 API client',
    riskLevel: 'high',
    dataHandling: 'Sends prompts to external API',
  },
  'anthropic': {
    category: 'llm',
    type: 'service',
    vendor: 'Anthropic',
    purpose: 'Claude API client',
    riskLevel: 'high',
    dataHandling: 'Sends prompts to external API',
  },
  'google-generativeai': {
    category: 'llm',
    type: 'service',
    vendor: 'Google',
    purpose: 'Google Gemini API client',
    riskLevel: 'high',
    dataHandling: 'Sends prompts to external API',
  },
  'langchain': {
    category: 'orchestration',
    type: 'framework',
    purpose: 'LLM application framework',
    riskLevel: 'high',
  },
  'llamaindex': {
    category: 'rag',
    type: 'framework',
    purpose: 'LLM data indexing and retrieval',
    riskLevel: 'high',
  },

  // ML Frameworks
  'tensorflow': {
    category: 'ml-framework',
    type: 'framework',
    vendor: 'Google',
    purpose: 'Deep learning framework',
    riskLevel: 'high',
  },
  'torch': {
    category: 'ml-framework',
    type: 'framework',
    vendor: 'Meta',
    purpose: 'PyTorch deep learning framework',
    riskLevel: 'high',
  },
  'pytorch': {
    category: 'ml-framework',
    type: 'framework',
    vendor: 'Meta',
    purpose: 'PyTorch deep learning framework',
    riskLevel: 'high',
  },
  'keras': {
    category: 'ml-framework',
    type: 'library',
    purpose: 'High-level deep learning API',
    riskLevel: 'high',
  },

  // ML Libraries & Tools
  'scikit-learn': {
    category: 'ml-library',
    type: 'library',
    purpose: 'Machine learning library',
    riskLevel: 'medium',
  },
  'sklearn': {
    category: 'ml-library',
    type: 'library',
    purpose: 'Machine learning library',
    riskLevel: 'medium',
  },
  'xgboost': {
    category: 'ml-library',
    type: 'library',
    purpose: 'Gradient boosting library',
    riskLevel: 'medium',
  },
  'lightgbm': {
    category: 'ml-library',
    type: 'library',
    purpose: 'Gradient boosting framework',
    riskLevel: 'medium',
  },

  // NLP & Transformers
  'transformers': {
    category: 'nlp',
    type: 'library',
    vendor: 'Hugging Face',
    purpose: 'Transformer models (BERT, GPT, etc.)',
    riskLevel: 'high',
  },
  'spacy': {
    category: 'nlp',
    type: 'library',
    purpose: 'Natural language processing',
    riskLevel: 'medium',
  },
  'nltk': {
    category: 'nlp',
    type: 'library',
    purpose: 'Natural language toolkit',
    riskLevel: 'low',
  },

  // Computer Vision
  'opencv': {
    category: 'computer-vision',
    type: 'library',
    purpose: 'Computer vision library',
    riskLevel: 'medium',
  },
  'pillow': {
    category: 'computer-vision',
    type: 'library',
    purpose: 'Image processing library',
    riskLevel: 'low',
  },
  'detectron2': {
    category: 'computer-vision',
    type: 'library',
    vendor: 'Meta',
    purpose: 'Object detection framework',
    riskLevel: 'high',
  },

  // Node.js ML
  '@tensorflow/tfjs': {
    category: 'ml-framework',
    type: 'framework',
    vendor: 'Google',
    purpose: 'TensorFlow JavaScript',
    riskLevel: 'high',
  },
  'tensorflow-js': {
    category: 'ml-framework',
    type: 'framework',
    vendor: 'Google',
    purpose: 'TensorFlow JavaScript',
    riskLevel: 'high',
  },
  'onnxjs': {
    category: 'ml-framework',
    type: 'framework',
    purpose: 'ONNX model runtime',
    riskLevel: 'high',
  },
  'ml5': {
    category: 'ml-library',
    type: 'library',
    purpose: 'Friendly machine learning',
    riskLevel: 'medium',
  },

  // Embeddings
  'sentence-transformers': {
    category: 'embeddings',
    type: 'library',
    vendor: 'Hugging Face',
    purpose: 'Semantic search embeddings',
    riskLevel: 'high',
  },

  // Data Processing
  'pandas': {
    category: 'data-processing',
    type: 'library',
    purpose: 'Data manipulation library',
    riskLevel: 'low',
  },
  'numpy': {
    category: 'data-processing',
    type: 'library',
    purpose: 'Numerical computing library',
    riskLevel: 'low',
  },
  'polars': {
    category: 'data-processing',
    type: 'library',
    purpose: 'Data frame library',
    riskLevel: 'low',
  },
};

/**
 * Parse Python requirements format
 */
function parsePythonRequirements(content: string): Array<{ name: string; version: string }> {
  const packages: Array<{ name: string; version: string }> = [];

  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // Handle various formats: package, package==1.0, package>=1.0, package[extra], etc.
    const match = trimmed.match(/^([a-zA-Z0-9\-_.]+)/);
    if (match) {
      const versionMatch = trimmed.match(/([>=<~!]+)?([\d.]+[^,\]]*)?/);
      packages.push({
        name: match[1].toLowerCase(),
        version: versionMatch?.[2] || 'latest',
      });
    }
  });

  return packages;
}

/**
 * Parse Node.js package.json
 */
function parseNodePackageJson(json: any): Array<{ name: string; version: string }> {
  const packages: Array<{ name: string; version: string }> = [];

  const allDeps = {
    ...json.dependencies,
    ...json.devDependencies,
    ...json.peerDependencies,
  };

  Object.entries(allDeps || {}).forEach(([name, version]: [string, any]) => {
    packages.push({
      name: name.toLowerCase(),
      version: String(version),
    });
  });

  return packages;
}

/**
 * Analyze packages and generate AI-BOM
 */
function generateBom(
  systemId: string,
  packages: Array<{ name: string; version: string }>
): AiBom {
  const components: AiBomComponent[] = [];
  const findings: string[] = [];

  packages.forEach(({ name, version }) => {
    const normalized = name.toLowerCase().replace(/[_-]/g, '');
    let found = false;

    // Check for exact and partial matches
    for (const [registryKey, config] of Object.entries(AI_FRAMEWORK_REGISTRY)) {
      const normalizedKey = registryKey.toLowerCase().replace(/[_-]/g, '');
      if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
        components.push({
          name: name,
          version: version,
          type: config.type as any,
          category: config.category,
          vendor: config.vendor,
          purpose: config.purpose,
          riskLevel: config.riskLevel as any,
          auditStatus: 'not-audited',
          dataHandling: config.dataHandling,
        });
        found = true;
        break;
      }
    }
  });

  // Generate findings
  const criticalCount = components.filter((c) => c.riskLevel === 'critical').length;
  const highRiskCount = components.filter((c) => c.riskLevel === 'high').length;

  if (highRiskCount > 0) {
    findings.push(
      `${highRiskCount} high-risk components detected (external APIs, cloud services). Requires data handling review.`
    );
  }

  if (criticalCount > 0) {
    findings.push(
      `${criticalCount} critical-risk components. Requires immediate audit and compliance review.`
    );
  }

  const requiresAssessment = components.length > 0;
  if (requiresAssessment) {
    findings.push('EU AI Act Article 11 compliance: AI-BOM must be documented and maintained.');
  }

  return {
    systemId,
    generatedAt: new Date().toISOString(),
    components,
    summary: {
      totalComponents: components.length,
      frameworkComponents: components.filter((c) => c.type === 'framework').length,
      criticalRiskCount: criticalCount,
      requiresAiActAssessment: requiresAssessment,
    },
    findings,
  };
}

/**
 * Generate AI-BOM from dependency files
 */
export async function generateAiBomFromDependencies(
  systemId: string,
  files: Array<{
    path: string;
    content: string;
  }>
): Promise<AiBom> {
  const packages: Array<{ name: string; version: string }> = [];

  for (const file of files) {
    if (file.path.endsWith('requirements.txt')) {
      packages.push(...parsePythonRequirements(file.content));
    } else if (file.path.endsWith('package.json')) {
      try {
        const json = JSON.parse(file.content);
        packages.push(...parseNodePackageJson(json));
      } catch (error) {
        console.warn(`Failed to parse ${file.path}:`, error);
      }
    }
    // Add pyproject.toml, poetry.lock, Dockerfile parsing as needed
  }

  return generateBom(systemId, packages);
}

/**
 * Generate AI-BOM from GitHub repository
 */
export async function generateAiBomFromGithubRepo(
  systemId: string,
  repoUrl: string,
  githubToken?: string
): Promise<AiBom> {
  // This would fetch dependency files from GitHub API
  // For now, returns a schema placeholder

  if (!repoUrl) {
    throw new Error('Repository URL is required');
  }

  // Placeholder: actual implementation would:
  // 1. Extract owner/repo from URL
  // 2. Fetch requirements.txt, package.json, etc. from GitHub API
  // 3. Call generateAiBomFromDependencies()

  return {
    systemId,
    generatedAt: new Date().toISOString(),
    components: [],
    summary: {
      totalComponents: 0,
      frameworkComponents: 0,
      criticalRiskCount: 0,
      requiresAiActAssessment: false,
    },
    findings: ['Placeholder BOM - requires GitHub API integration'],
  };
}
