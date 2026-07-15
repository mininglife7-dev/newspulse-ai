/**
 * GitHub AI System Auto-Discovery
 * Scans a GitHub organization/user for AI system patterns
 * - Machine learning repositories (TensorFlow, PyTorch, sklearn)
 * - LLM/generative AI usage (OpenAI, Anthropic, HuggingFace)
 * - Deployment pipelines indicating AI services
 */

export interface GitHubAISystemDetection {
  id: string; // GitHub repository ID
  name: string; // Repository name
  description?: string;
  url: string; // Repository URL
  language: string; // Primary language (Python, JavaScript, etc.)
  topics: string[]; // GitHub topics
  detectedPatterns: string[]; // Why we think this is an AI system
  confidence: number; // 0-100: confidence this is an AI system
  lastUpdated: string; // ISO timestamp
}

export interface GitHubDiscoveryConfig {
  token: string; // GitHub personal access token or app token
  org?: string; // Organization to scan
  username?: string; // User to scan (if not org)
  includePrivate?: boolean; // Include private repos
}

/**
 * Patterns indicating AI systems
 */
const AI_INDICATORS = {
  frameworks: [
    'tensorflow',
    'pytorch',
    'keras',
    'scikit-learn',
    'sklearn',
    'transformers',
    'huggingface',
    'openai',
    'anthropic',
    'langchain',
    'llamaindex',
    'ollama',
    'mistral',
  ],
  topics: [
    'machine-learning',
    'deep-learning',
    'ai',
    'llm',
    'generative-ai',
    'nlp',
    'computer-vision',
    'neural-network',
    'tensorflow',
    'pytorch',
  ],
  filePatterns: [
    'requirements.txt', // Python ML dependencies
    'environment.yml', // Conda ML environments
    'pyproject.toml', // Python project config
    'setup.py', // Python setup
    'package.json', // Node.js (could be ML)
    'Dockerfile', // Containerized deployment (often ML)
    'model.pkl', // Pickled models
    'model.pt', // PyTorch models
    'checkpoint', // Model checkpoints
  ],
};

/**
 * Score a GitHub repository for likelihood of being an AI system
 */
function scoreAILikelihood(
  repo: any,
  topics: string[],
  languages: string[]
): { score: number; patterns: string[] } {
  const patterns: string[] = [];
  let score = 0;

  // Check repository name
  const repoName = (repo.name || '').toLowerCase();
  if (AI_INDICATORS.frameworks.some((f) => repoName.includes(f))) {
    score += 30;
    patterns.push(`Repository name contains AI framework: ${repoName}`);
  }

  // Check description
  const description = (repo.description || '').toLowerCase();
  if (AI_INDICATORS.frameworks.some((f) => description.includes(f))) {
    score += 20;
    patterns.push(
      `Repository description mentions AI framework: ${repo.description}`
    );
  }

  // Check GitHub topics
  const matchingTopics = topics.filter((t) =>
    AI_INDICATORS.topics.includes(t.toLowerCase())
  );
  if (matchingTopics.length > 0) {
    score += 25 * matchingTopics.length;
    patterns.push(`Topics indicate AI: ${matchingTopics.join(', ')}`);
  }

  // Check primary language (Python is strong indicator for ML)
  if (repo.language === 'Python') {
    score += 15;
    patterns.push('Primary language is Python (common for ML)');
  }

  // Check for common ML indicators in file names
  if (repo.has_downloads || repo.has_wiki) {
    score += 5;
    patterns.push('Repository has documentation (typical for ML projects)');
  }

  // Penalize if it's a fork without stars (likely not production AI)
  if (repo.fork && repo.stargazers_count < 10) {
    score = Math.max(0, score - 20);
  }

  // Boost if it has significant stars/activity (likely production)
  if (repo.stargazers_count > 100) {
    score = Math.min(100, score + 10);
    patterns.push(`Repository has ${repo.stargazers_count} stars (active project)`);
  }

  return { score: Math.min(100, Math.max(0, score)), patterns };
}

/**
 * Query GitHub API for repositories in organization/user
 * Returns repository list for further analysis
 */
export async function queryGitHubRepositories(config: GitHubDiscoveryConfig) {
  const { token, org, username } = config;

  if (!token) {
    throw new Error('GitHub token is required');
  }

  if (!org && !username) {
    throw new Error('Either organization or username is required');
  }

  const target = org || username;
  const query = `
    query {
      ${org ? `organization(login: "${org}")` : `user(login: "${username}")`} {
        repositories(first: 100, privacy: ${config.includePrivate ? 'ALL' : 'PUBLIC'}, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            id
            name
            description
            url
            primaryLanguage {
              name
            }
            repositoryTopics(first: 10) {
              nodes {
                topic {
                  name
                }
              }
            }
            stargazerCount
            forkCount
            isArchived
            updatedAt
            hasDownloads
            hasWiki
            hasPages
            diskUsage
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GitHub GraphQL error: ${data.errors.map((e: any) => e.message).join(', ')}`);
    }

    const entity = org
      ? data.data.organization
      : data.data.user;

    if (!entity) {
      throw new Error(
        `${org ? 'Organization' : 'User'} "${target}" not found or not accessible`
      );
    }

    return {
      target,
      repositories: entity.repositories.nodes || [],
      hasNextPage: entity.repositories.pageInfo?.hasNextPage || false,
    };
  } catch (error) {
    throw new Error(
      `Failed to query GitHub: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Analyze repositories and score them for AI system likelihood
 */
export function analyzeRepositoriesForAI(
  repositories: any[]
): GitHubAISystemDetection[] {
  return repositories
    .map((repo) => {
      const topics =
        repo.repositoryTopics?.nodes?.map((t: any) => t.topic.name) || [];
      const { score, patterns } = scoreAILikelihood(
        repo,
        topics,
        repo.primaryLanguage?.name ? [repo.primaryLanguage.name] : []
      );

      return {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.url,
        language: repo.primaryLanguage?.name || 'Unknown',
        topics,
        detectedPatterns: patterns,
        confidence: score,
        lastUpdated: repo.updatedAt,
      };
    })
    .filter((detection) => detection.confidence >= 40) // Only return confident matches
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Full discovery flow: Query GitHub and analyze for AI systems
 */
export async function discoverGitHubAISystems(
  config: GitHubDiscoveryConfig
): Promise<GitHubAISystemDetection[]> {
  const { repositories, target } = await queryGitHubRepositories(config);

  if (!repositories.length) {
    console.log(`No repositories found for ${target}`);
    return [];
  }

  console.log(
    `[GitHub Discovery] Found ${repositories.length} repositories in ${target}`
  );

  const analyzed = analyzeRepositoriesForAI(repositories);
  console.log(
    `[GitHub Discovery] Detected ${analyzed.length} potential AI systems`
  );

  return analyzed;
}
