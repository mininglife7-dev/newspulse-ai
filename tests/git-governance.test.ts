import { describe, it, expect } from 'vitest';
import {
  CommitMessageValidator,
  BranchNameValidator,
  MergeValidator,
  PRValidator,
  GitGovernanceOrchestrator,
} from '../lib/git-governance';

describe('git-governance (DNA-GOV-010)', () => {
  describe('CommitMessageValidator', () => {
    const validator = new CommitMessageValidator();

    it('accepts valid commit message', () => {
      const result = validator.validate('feat(auth): add google oauth support');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('feat');
      expect(result.scope).toBe('auth');
      expect(result.message).toBe('add google oauth support');
    });

    it('accepts commit without scope', () => {
      const result = validator.validate('fix: resolve null pointer exception');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('fix');
      expect(result.scope).toBeUndefined();
    });

    it('rejects message with uppercase description', () => {
      const result = validator.validate('feat: Add new feature');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('lowercase'))).toBe(true);
    });

    it('rejects message with invalid type', () => {
      const result = validator.validate('feature(auth): add oauth');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid commit type'))).toBe(
        true
      );
    });

    it('rejects message missing colon', () => {
      const result = validator.validate('feat(auth) add oauth');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects empty commit message', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
    });

    it('validates commit with body', () => {
      const message = `feat(auth): add google oauth support

This adds support for Google OAuth authentication
to improve user onboarding flow.

Closes #123`;
      const result = validator.validate(message);
      expect(result.valid).toBe(true);
    });

    it('rejects body line exceeding 72 characters', () => {
      const message = `feat(auth): add google oauth

This is a very long line that exceeds the recommended 72 character limit and should fail validation`;
      const result = validator.validate(message);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('72 characters'))).toBe(true);
    });

    it('accepts all valid commit types', () => {
      const types = [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'ci',
      ];
      for (const type of types) {
        const result = validator.validate(`${type}: description`);
        expect(result.valid).toBe(true);
        expect(result.type).toBe(type);
      }
    });
  });

  describe('BranchNameValidator', () => {
    const validator = new BranchNameValidator();

    it('accepts valid feature branch', () => {
      const result = validator.validate('feature/oauth-support');
      expect(result.valid).toBe(true);
      expect(result.category).toBe('feature');
    });

    it('accepts valid fix branch', () => {
      const result = validator.validate('fix/null-pointer');
      expect(result.valid).toBe(true);
      expect(result.category).toBe('fix');
    });

    it('rejects commit to main', () => {
      const result = validator.validate('main');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('main'))).toBe(true);
    });

    it('rejects commit to master', () => {
      const result = validator.validate('master');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('master'))).toBe(true);
    });

    it('rejects invalid category', () => {
      const result = validator.validate('random/feature-name');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('convention'))).toBe(true);
    });

    it('rejects branch with uppercase', () => {
      const result = validator.validate('feature/OAuthSupport');
      expect(result.valid).toBe(false);
    });

    it('rejects branch name too short', () => {
      const result = validator.validate('feature/ab');
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('at least 3 characters'))
      ).toBe(true);
    });

    it('rejects branch name ending with hyphen', () => {
      const result = validator.validate('feature/oauth-');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('hyphen'))).toBe(true);
    });

    it('accepts all valid categories', () => {
      const categories = [
        'feature',
        'fix',
        'docs',
        'refactor',
        'chore',
        'test',
        'perf',
      ];
      for (const category of categories) {
        const result = validator.validate(`${category}/valid-name`);
        expect(result.valid).toBe(true);
        expect(result.category).toBe(category);
      }
    });
  });

  describe('MergeValidator', () => {
    const validator = new MergeValidator();

    it('allows merge to non-main branch without checks', () => {
      const result = validator.validate({
        baseBranch: 'develop',
        isForceUpdate: true,
        hasLinearHistory: false,
        allChecksPassing: false,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects force-push to main', () => {
      const result = validator.validate({
        baseBranch: 'main',
        isForceUpdate: true,
        hasLinearHistory: true,
        allChecksPassing: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Force-push'))).toBe(true);
    });

    it('rejects merge when checks failing', () => {
      const result = validator.validate({
        baseBranch: 'main',
        isForceUpdate: false,
        hasLinearHistory: true,
        allChecksPassing: false,
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('not all status checks'))
      ).toBe(true);
    });

    it('warns about merge commits to main', () => {
      const result = validator.validate({
        baseBranch: 'main',
        isForceUpdate: false,
        hasLinearHistory: false,
        allChecksPassing: true,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('merge commit'))).toBe(
        true
      );
    });

    it('rejects auto-merge to main', () => {
      const result = validator.validate({
        baseBranch: 'main',
        isForceUpdate: false,
        hasLinearHistory: true,
        allChecksPassing: true,
        isAutoMerge: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Auto-merge'))).toBe(true);
    });

    it('allows clean merge to main', () => {
      const result = validator.validate({
        baseBranch: 'main',
        isForceUpdate: false,
        hasLinearHistory: true,
        allChecksPassing: true,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('PRValidator', () => {
    const validator = new PRValidator();

    it('validates complete PR', () => {
      const result = validator.validate({
        title: 'feat: add oauth support',
        body: 'This adds Google and GitHub OAuth...',
        commitMessages: ['feat(auth): add google oauth support'],
        hasLinkedIssue: true,
      });
      expect(result.valid).toBe(true);
      expect(result.checks.hasLinkedIssue).toBe(true);
      expect(result.checks.messageFollowsConvention).toBe(true);
      expect(result.checks.titleUnder72Chars).toBe(true);
      expect(result.checks.descriptionPresent).toBe(true);
    });

    it('rejects empty title', () => {
      const result = validator.validate({
        title: '',
        commitMessages: ['feat: add feature'],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('title'))).toBe(true);
    });

    it('warns about missing linked issue', () => {
      const result = validator.validate({
        title: 'feat: add feature',
        commitMessages: ['feat: add feature'],
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('linked'))).toBe(true);
      expect(result.checks.hasLinkedIssue).toBe(false);
    });

    it('warns about long title', () => {
      const result = validator.validate({
        title:
          'feat: add very long title that exceeds the recommended 72 character limit and should warn',
        commitMessages: ['feat: add feature'],
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('72 characters'))).toBe(
        true
      );
      expect(result.checks.titleUnder72Chars).toBe(false);
    });

    it('rejects invalid commit messages', () => {
      const result = validator.validate({
        title: 'feat: add feature',
        commitMessages: ['Invalid commit message without convention'],
      });
      expect(result.valid).toBe(false);
      expect(result.checks.messageFollowsConvention).toBe(false);
    });

    it('validates multiple commits', () => {
      const result = validator.validate({
        title: 'feat: add oauth',
        commitMessages: [
          'feat(auth): add google oauth',
          'test(auth): add oauth tests',
        ],
      });
      expect(result.valid).toBe(true);
      expect(result.checks.messageFollowsConvention).toBe(true);
    });
  });

  describe('GitGovernanceOrchestrator', () => {
    const orchestrator = new GitGovernanceOrchestrator();

    it('validates complete PR workflow', () => {
      const result = orchestrator.validatePRWorkflow({
        sourceBranch: 'feature/oauth',
        baseBranch: 'main',
        title: 'feat: add oauth support',
        body: 'Adds Google and GitHub OAuth',
        commitMessages: ['feat(auth): add google oauth support'],
        isForceUpdate: false,
        hasLinearHistory: true,
        allChecksPassing: true,
        hasLinkedIssue: true,
      });
      expect(result.valid).toBe(true);
      expect(result.allErrors).toHaveLength(0);
    });

    it('detects multiple violations', () => {
      const result = orchestrator.validatePRWorkflow({
        sourceBranch: 'main',
        baseBranch: 'main',
        title: '',
        body: '',
        commitMessages: ['Invalid message'],
        isForceUpdate: true,
        hasLinearHistory: false,
        allChecksPassing: false,
        hasLinkedIssue: false,
      });
      expect(result.valid).toBe(false);
      expect(result.allErrors.length).toBeGreaterThan(0);
      expect(result.branchValidation.valid).toBe(false);
      expect(result.prValidation.valid).toBe(false);
      expect(result.mergeValidation.valid).toBe(false);
    });

    it('delegates to individual validators', () => {
      const commitResult = orchestrator.validateCommit('feat(auth): add oauth');
      expect(commitResult.valid).toBe(true);

      const branchResult = orchestrator.validateBranch('feature/oauth');
      expect(branchResult.valid).toBe(true);

      const mergeResult = orchestrator.validateMerge({
        baseBranch: 'main',
        isForceUpdate: false,
        hasLinearHistory: true,
        allChecksPassing: true,
      });
      expect(mergeResult.valid).toBe(true);

      const prResult = orchestrator.validatePR({
        title: 'feat: add oauth',
        commitMessages: ['feat(auth): add oauth'],
      });
      expect(prResult.valid).toBe(true);
    });
  });
});
