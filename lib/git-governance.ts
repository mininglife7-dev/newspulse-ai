import { execSync } from 'child_process';

/**
 * DNA-GOV-010: Git Governance
 *
 * Enforces commit message standards, prevents dangerous git operations,
 * and validates PR titles for changelog auto-generation.
 *
 * Standards:
 * - Commit messages: format type(scope): description
 * - Force-pushes: blocked on main branch (reversible; requires explicit override)
 * - PR titles: must match commit message pattern for changelog consistency
 */

export interface CommitMessage {
  type: string;
  scope?: string;
  description: string;
  body?: string;
  isValid: boolean;
  errors: string[];
}

export type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore' | 'perf' | 'ci';

const VALID_COMMIT_TYPES: CommitType[] = [
  'feat', // New feature
  'fix', // Bug fix
  'docs', // Documentation
  'style', // Code style (formatting, etc)
  'refactor', // Code refactoring
  'test', // Test additions/fixes
  'chore', // Build, dependencies, etc
  'perf', // Performance improvements
  'ci', // CI/CD changes
];

const COMMIT_MESSAGE_REGEX = /^(feat|fix|docs|style|refactor|test|chore|perf|ci)(?:\(([^)]+)\))?: (.+)$/;

export function parseCommitMessage(message: string): CommitMessage {
  const lines = message.trim().split('\n');
  const firstLine = lines[0];
  const errors: string[] = [];

  const match = firstLine.match(COMMIT_MESSAGE_REGEX);

  if (!match) {
    return {
      type: '',
      scope: undefined,
      description: firstLine,
      body: lines.slice(1).join('\n'),
      isValid: false,
      errors: [
        'Commit message must follow format: type(scope): description',
        `Valid types: ${VALID_COMMIT_TYPES.join(', ')}`,
        `Example: feat(auth): add password reset flow`,
      ],
    };
  }

  const [, type, scope, description] = match;

  if (!VALID_COMMIT_TYPES.includes(type as CommitType)) {
    errors.push(`Invalid commit type: "${type}". Valid types: ${VALID_COMMIT_TYPES.join(', ')}`);
  }

  if (!description || description.length === 0) {
    errors.push('Commit description cannot be empty');
  }

  if (description && description.length > 100) {
    errors.push(`Commit description too long (${description.length} chars). Keep it under 100 characters.`);
  }

  if (scope && scope.length > 50) {
    errors.push(`Scope too long (${scope.length} chars). Keep it under 50 characters.`);
  }

  return {
    type: type as CommitType,
    scope: scope || undefined,
    description,
    body: lines.slice(1).join('\n'),
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePRTitle(title: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!title || title.trim().length === 0) {
    errors.push('PR title cannot be empty');
    return { isValid: false, errors };
  }

  const match = title.match(COMMIT_MESSAGE_REGEX);

  if (!match) {
    errors.push('PR title must follow format: type(scope): description');
    errors.push(`Valid types: ${VALID_COMMIT_TYPES.join(', ')}`);
    errors.push(`Example: feat(auth): add password reset flow`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function detectForcePush(refName: string): boolean {
  // Check if this is a force-push to main or release branches
  const protectedBranches = ['main', 'master', 'production', 'release'];
  return protectedBranches.some((branch) => refName.includes(branch));
}

export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

export function getCommitsSinceBase(baseBranch: string = 'main'): string[] {
  try {
    const output = execSync(`git log ${baseBranch}..HEAD --oneline`, { encoding: 'utf-8' });
    return output
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.split(' ').slice(1).join(' '));
  } catch {
    return [];
  }
}

export function validateAllCommits(baseBranch: string = 'main'): {
  allValid: boolean;
  results: Array<{ commit: string; parsed: CommitMessage }>;
} {
  const commits = getCommitsSinceBase(baseBranch);
  const results = commits.map((commit) => ({
    commit,
    parsed: parseCommitMessage(commit),
  }));

  const allValid = results.every((r) => r.parsed.isValid);

  return {
    allValid,
    results,
  };
}

export function formatCommitValidationReport(
  results: Array<{ commit: string; parsed: CommitMessage }>
): string {
  const lines = ['Commit Message Validation Report', '='.repeat(40)];

  for (const result of results) {
    if (result.parsed.isValid) {
      lines.push(`✅ ${result.commit}`);
    } else {
      lines.push(`❌ ${result.commit}`);
      for (const error of result.parsed.errors) {
        lines.push(`   - ${error}`);
      }
    }
  }

  return lines.join('\n');
}
