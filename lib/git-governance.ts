/**
 * DNA-GOV-010: Git Governance
 *
 * Enforce development best practices through autonomous git policy enforcement.
 * Prevents merge mistakes, validates commit conventions, and enables safe autonomous operations.
 */

export interface CommitValidationResult {
  valid: boolean
  type?: string
  scope?: string
  message?: string
  errors: string[]
}

export interface BranchValidationResult {
  valid: boolean
  name?: string
  category?: string // 'feature', 'fix', 'docs', 'refactor', 'chore', etc.
  errors: string[]
}

export interface MergeValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface PRValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  checks: {
    hasLinkedIssue: boolean
    messageFollowsConvention: boolean
    titleUnder72Chars: boolean
    descriptionPresent: boolean
  }
}

/**
 * Validate commit message follows Conventional Commits format.
 * Format: type(scope): description
 * Example: feat(auth): add google oauth support
 */
export class CommitMessageValidator {
  private readonly validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci']
  private readonly typePattern = new RegExp(`^(${this.validTypes.join('|')})(?:\\(([^)]+)\\))?:\\s(.+)$`, 'm')

  validate(message: string): CommitValidationResult {
    const errors: string[] = []
    const trimmed = message.trim()

    if (trimmed.length === 0) {
      return { valid: false, errors: ['Commit message is empty'] }
    }

    const lines = trimmed.split('\n')
    const firstLine = lines[0]
    const match = firstLine.match(this.typePattern)

    if (!match) {
      // Check if it's an invalid type vs completely wrong format
      const typeMatch = firstLine.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.*)$/)
      if (typeMatch) {
        const [, invalidType] = typeMatch
        errors.push(`Invalid commit type "${invalidType}". Must be one of: ${this.validTypes.join(', ')}`)
      } else {
        errors.push(
          `Commit message does not follow Conventional Commits format. Expected: type(scope): description\nGot: ${firstLine}`
        )
      }
      return { valid: false, errors }
    }

    const [, type, scope, description] = match

    // Validate type
    if (!this.validTypes.includes(type)) {
      errors.push(`Invalid commit type "${type}". Must be one of: ${this.validTypes.join(', ')}`)
    }

    // Validate description
    if (!description || description.length === 0) {
      errors.push('Commit description cannot be empty')
    } else if (description[0] === description[0].toUpperCase() && description[0] !== description[0].toLowerCase()) {
      errors.push('Commit description must start with lowercase letter')
    }

    // Validate body line length (if present)
    if (lines.length > 1) {
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i]
        if (line && line.length > 72) {
          errors.push(`Line ${i + 1} exceeds 72 characters (${line.length}). Keep body lines concise.`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      type,
      scope: scope || undefined,
      message: description,
      errors,
    }
  }
}

/**
 * Validate branch name follows naming conventions.
 * Expected: category/descriptive-name
 * Examples: feature/oauth, fix/auth-timeout, docs/update-readme
 */
export class BranchNameValidator {
  private readonly validCategories = ['feature', 'fix', 'docs', 'refactor', 'chore', 'test', 'perf']
  private readonly branchPattern = new RegExp(`^(${this.validCategories.join('|')})\/([a-z0-9-]+)$`)

  validate(branchName: string): BranchValidationResult {
    const errors: string[] = []

    // Disallow commits to main/master
    if (branchName === 'main' || branchName === 'master') {
      return {
        valid: false,
        name: branchName,
        errors: ['Cannot commit directly to main/master. Create a feature branch instead.'],
      }
    }

    const match = branchName.match(this.branchPattern)

    if (!match) {
      errors.push(
        `Branch name does not follow convention. Expected: category/name\nValid categories: ${this.validCategories.join(', ')}\nExample: feature/oauth-support\nGot: ${branchName}`
      )
      return { valid: false, name: branchName, errors }
    }

    const [, category, name] = match

    // Validate name part
    if (name.length < 3) {
      errors.push('Branch name must be at least 3 characters after category/')
    }

    if (name.endsWith('-')) {
      errors.push('Branch name cannot end with hyphen')
    }

    return {
      valid: errors.length === 0,
      name: branchName,
      category,
      errors,
    }
  }
}

/**
 * Validate merge safety to main branch.
 * Ensures no force-push, clean history, all checks passing.
 */
export class MergeValidator {
  validate(options: {
    baseBranch: string
    isForceUpdate: boolean
    hasLinearHistory: boolean
    allChecksPassing: boolean
    isAutoMerge?: boolean
  }): MergeValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Only validate strict rules for main branch
    if (options.baseBranch === 'main' || options.baseBranch === 'master') {
      if (options.isForceUpdate) {
        errors.push('Force-push to main is not allowed. Rebase your branch and retry.')
      }

      if (!options.hasLinearHistory) {
        warnings.push('Merge creates a merge commit. Prefer rebase-and-merge for clean history.')
      }

      if (!options.allChecksPassing) {
        errors.push('Cannot merge: not all status checks are passing. Fix failing checks before merge.')
      }

      if (options.isAutoMerge) {
        errors.push('Auto-merge is not allowed for main branch. Require manual verification.')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}

/**
 * Validate pull request readiness.
 * Checks commit message format, title length, and required metadata.
 */
export class PRValidator {
  private commitValidator = new CommitMessageValidator()

  validate(options: {
    title: string
    body?: string
    commitMessages: string[]
    hasLinkedIssue?: boolean
  }): PRValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const checks = {
      hasLinkedIssue: Boolean(options.hasLinkedIssue),
      messageFollowsConvention: true,
      titleUnder72Chars: options.title.length <= 72,
      descriptionPresent: (options.body || '').trim().length > 0,
    }

    // Validate PR title (should follow commit convention)
    if (!options.title || options.title.length === 0) {
      errors.push('PR title cannot be empty')
    } else if (options.title.length > 72) {
      warnings.push(`PR title exceeds 72 characters (${options.title.length}). Keep titles concise.`)
    }

    // Validate commit messages
    for (const message of options.commitMessages) {
      const validation = this.commitValidator.validate(message)
      if (!validation.valid) {
        checks.messageFollowsConvention = false
        errors.push(`Commit message invalid: ${validation.errors.join('; ')}`)
      }
    }

    // Recommend linked issue (informational)
    if (!Boolean(options.hasLinkedIssue)) {
      warnings.push('Consider adding a linked issue for better traceability (e.g., "Fixes #123")')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checks,
    }
  }
}

/**
 * Comprehensive git governance orchestrator.
 * Validates all aspects of a git operation.
 */
export class GitGovernanceOrchestrator {
  private commitValidator = new CommitMessageValidator()
  private branchValidator = new BranchNameValidator()
  private mergeValidator = new MergeValidator()
  private prValidator = new PRValidator()

  validateCommit(message: string): CommitValidationResult {
    return this.commitValidator.validate(message)
  }

  validateBranch(branchName: string): BranchValidationResult {
    return this.branchValidator.validate(branchName)
  }

  validateMerge(options: {
    baseBranch: string
    isForceUpdate: boolean
    hasLinearHistory: boolean
    allChecksPassing: boolean
    isAutoMerge?: boolean
  }): MergeValidationResult {
    return this.mergeValidator.validate(options)
  }

  validatePR(options: {
    title: string
    body?: string
    commitMessages: string[]
    hasLinkedIssue?: boolean
  }): PRValidationResult {
    return this.prValidator.validate(options)
  }

  /**
   * Comprehensive validation of entire PR workflow.
   */
  validatePRWorkflow(options: {
    sourceBranch: string
    baseBranch: string
    title: string
    body?: string
    commitMessages: string[]
    isForceUpdate: boolean
    hasLinearHistory: boolean
    allChecksPassing: boolean
    hasLinkedIssue?: boolean
  }): {
    valid: boolean
    branchValidation: BranchValidationResult
    prValidation: PRValidationResult
    mergeValidation: MergeValidationResult
    allErrors: string[]
    allWarnings: string[]
  } {
    const branchValidation = this.validateBranch(options.sourceBranch)
    const prValidation = this.validatePR({
      title: options.title,
      body: options.body,
      commitMessages: options.commitMessages,
      hasLinkedIssue: options.hasLinkedIssue,
    })
    const mergeValidation = this.validateMerge({
      baseBranch: options.baseBranch,
      isForceUpdate: options.isForceUpdate,
      hasLinearHistory: options.hasLinearHistory,
      allChecksPassing: options.allChecksPassing,
    })

    const allErrors = [...branchValidation.errors, ...prValidation.errors, ...mergeValidation.errors]
    const allWarnings = [...prValidation.warnings, ...mergeValidation.warnings]

    return {
      valid: allErrors.length === 0,
      branchValidation,
      prValidation,
      mergeValidation,
      allErrors,
      allWarnings,
    }
  }
}
