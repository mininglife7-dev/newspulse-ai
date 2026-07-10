import { describe, it, expect } from 'vitest';
import {
  parseCommitMessage,
  validatePRTitle,
  detectForcePush,
  formatCommitValidationReport,
  type CommitMessage,
} from '@/lib/git-governance';

describe('Git Governance', () => {
  describe('parseCommitMessage', () => {
    it('should parse valid commit message with scope', () => {
      const msg = 'feat(auth): add password reset flow';
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(true);
      expect(result.type).toBe('feat');
      expect(result.scope).toBe('auth');
      expect(result.description).toBe('add password reset flow');
      expect(result.errors).toHaveLength(0);
    });

    it('should parse valid commit message without scope', () => {
      const msg = 'docs: update README with setup instructions';
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(true);
      expect(result.type).toBe('docs');
      expect(result.scope).toBeUndefined();
      expect(result.description).toBe('update README with setup instructions');
    });

    it('should reject invalid commit type', () => {
      const msg = 'feature(auth): add password reset';
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty description', () => {
      const msg = 'feat(auth): ';
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(false);
    });

    it('should reject description over 100 characters', () => {
      const msg = 'feat(auth): ' + 'a'.repeat(101);
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(false);
    });

    it('should accept all valid commit types', () => {
      const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci'];

      for (const type of types) {
        const msg = `${type}(scope): description`;
        const result = parseCommitMessage(msg);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe(type);
      }
    });

    it('should handle multiline commit messages', () => {
      const msg = `feat(auth): add password reset\n\nThis adds a complete password reset flow with email verification.`;
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(true);
      expect(result.type).toBe('feat');
      expect(result.body).toContain('complete password reset flow');
    });
  });

  describe('validatePRTitle', () => {
    it('should validate correct PR title', () => {
      const result = validatePRTitle('feat(compliance): add audit logging');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid PR title format', () => {
      const result = validatePRTitle('Add audit logging to compliance');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty PR title', () => {
      const result = validatePRTitle('');

      expect(result.isValid).toBe(false);
    });
  });

  describe('detectForcePush', () => {
    it('should detect force-push to main', () => {
      expect(detectForcePush('main')).toBe(true);
    });

    it('should detect force-push to master', () => {
      expect(detectForcePush('master')).toBe(true);
    });

    it('should detect force-push to production', () => {
      expect(detectForcePush('production')).toBe(true);
    });

    it('should detect force-push to release branch', () => {
      expect(detectForcePush('release/v1.0')).toBe(true);
    });

    it('should allow force-push to feature branches', () => {
      expect(detectForcePush('feat/my-feature')).toBe(false);
    });

    it('should allow force-push to dev branches', () => {
      expect(detectForcePush('develop')).toBe(false);
    });
  });

  describe('formatCommitValidationReport', () => {
    it('should format report with valid commits', () => {
      const results: Array<{ commit: string; parsed: CommitMessage }> = [
        {
          commit: 'feat(auth): add password reset',
          parsed: parseCommitMessage('feat(auth): add password reset'),
        },
        {
          commit: 'fix(notifications): handle missing user data',
          parsed: parseCommitMessage('fix(notifications): handle missing user data'),
        },
      ];

      const report = formatCommitValidationReport(results);

      expect(report).toContain('✅');
      expect(report).toContain('feat(auth): add password reset');
    });

    it('should format report with invalid commits', () => {
      const results: Array<{ commit: string; parsed: CommitMessage }> = [
        {
          commit: 'invalid message',
          parsed: parseCommitMessage('invalid message'),
        },
      ];

      const report = formatCommitValidationReport(results);

      expect(report).toContain('❌');
    });
  });

  describe('Commit type validation', () => {
    const validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci'];

    it('should accept all standard commit types', () => {
      for (const type of validTypes) {
        const msg = `${type}(scope): description`;
        const result = parseCommitMessage(msg);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe(type);
      }
    });

    it('should reject non-standard commit types', () => {
      const invalidTypes = ['feature', 'bugfix', 'hotfix', 'wip', 'release'];

      for (const type of invalidTypes) {
        const msg = `${type}(scope): description`;
        const result = parseCommitMessage(msg);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Scope validation', () => {
    it('should accept scopes under 50 characters', () => {
      const msg = 'feat(auth-password-reset-email-flow): description';
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(true);
    });

    it('should reject scopes over 50 characters', () => {
      const longScope = 'a'.repeat(51);
      const msg = `feat(${longScope}): description`;
      const result = parseCommitMessage(msg);

      expect(result.isValid).toBe(false);
    });
  });
});
