/**
 * Governor OS Foundation — Policy Engine
 * Evaluates capability requests against Cathedral policies.
 * Policies come from CATHEDRAL_DNA.yaml (prohibited actions) and CATHEDRAL_GENOME.yaml (approval gates).
 * Returns: ALLOW | ALLOW_WITH_AUDIT | DENY
 */

import { CapabilityRegistry } from './capability-registry';
import { PolicyAction } from './types';

export class PolicyEngine {
  private registry: CapabilityRegistry;

  /**
   * Prohibited actions (from CATHEDRAL_DNA.yaml)
   * These are NEVER allowed, no matter what
   */
  private static readonly PROHIBITED_PATTERNS = [
    // Fabricated evidence
    'fabricate_evidence',
    'fake_output',
    'mock_completion_without_execution',

    // Unsupported readiness claims
    'claim_go_without_evidence',
    'claim_readiness_without_test',
    'deploy_without_verification',

    // Prompt injection / unsafe commands
    'shell_metacharacter_unescaped',
    'command_with_pipe_unsanitized',
    'command_with_backtick_unescaped',

    // Secret exposure
    'log_secret_in_output',
    'commit_secret_to_repo',
    'expose_api_key',

    // Autonomous DNA modification
    'modify_cathedral_dna',
    'change_founder_authority',
    'disable_approval_gates',

    // Irreversible production actions
    'delete_production_database',
    'drop_table_without_backup',
    'production_force_push',

    // Silent security weakening
    'disable_policy_engine',
    'skip_evidence_collection',
    'suppress_error_reporting',
  ];

  /**
   * ALLOWLIST of commands that are safe to execute
   * Only commands matching these patterns are allowed
   */
  private static readonly ALLOWLIST = [
    /^npm\s+(install|ci|lint|type-check|test|build|run)/,
    /^git\s+(status|log|show|diff|checkout|reset|fetch|pull|push|commit|add|branch|tag|rebase|merge)/,
    /^bash\s+-c\s+/,
    /^npx\s+/,
  ];

  /**
   * Dangerous commands that require explicit approval
   */
  private static readonly DANGEROUS_PATTERNS = [
    /rm\s+-rf/, // Recursive delete
    /docker\s+(run|exec|build|push)/, // Container operations
    /aws\s+/, // AWS CLI
    /curl\s+.*-X\s+(POST|PUT|DELETE)/, // Mutations via HTTP
  ];

  constructor(registry: CapabilityRegistry) {
    this.registry = registry;
  }

  /**
   * Evaluate a capability request
   */
  async evaluate(
    capabilityId: string,
    context: {
      task_id: string;
      mission_id: string;
      command?: string;
      actor: string;
      authority_level: 'autonomous' | 'approval_required' | 'founder_only';
    }
  ): Promise<{
    action: PolicyAction;
    reason: string;
    approval_required: boolean;
  }> {
    // Step 1: Check if capability exists
    const capability = this.registry.getCapability(capabilityId);
    if (!capability) {
      return {
        action: 'DENY',
        reason: `Capability not found: ${capabilityId}`,
        approval_required: false,
      };
    }

    // Step 2: Check if capability is available
    if (!this.registry.isCapabilityAvailable(capabilityId)) {
      return {
        action: 'DENY',
        reason: `Capability not available in this environment: ${capabilityId} (status: ${capability.status})`,
        approval_required: false,
      };
    }

    // Step 3: If command provided, check against security rules
    if (context.command) {
      const securityCheck = this.checkCommandSecurity(context.command);
      if (!securityCheck.allowed) {
        return {
          action: 'DENY',
          reason: securityCheck.reason,
          approval_required: false,
        };
      }
    }

    // Step 4: Determine policy action based on danger class
    const dangerClass = this.registry.getDangerClass(capabilityId);
    const requiresAudit = this.registry.requiresAudit(capabilityId);
    const requiresApproval = this.registry.requiresApproval(capabilityId);

    // SAFE capabilities with audit can proceed
    if (dangerClass === 'SAFE') {
      return {
        action: 'ALLOW',
        reason: `SAFE capability (${capabilityId}) allowed for all`,
        approval_required: false,
      };
    }

    // AUDIT_REQUIRED capabilities allowed but must be logged
    if (dangerClass === 'AUDIT_REQUIRED' && requiresAudit) {
      return {
        action: 'ALLOW_WITH_AUDIT',
        reason: `AUDIT_REQUIRED capability (${capabilityId}) requires evidence trail`,
        approval_required: false,
      };
    }

    // APPROVAL_REQUIRED capabilities need explicit approval
    if (dangerClass === 'APPROVAL_REQUIRED' || requiresApproval) {
      if (context.authority_level === 'founder_only') {
        return {
          action: 'ALLOW',
          reason: `APPROVAL_REQUIRED capability (${capabilityId}) allowed for Founder`,
          approval_required: true,
        };
      }

      if (context.authority_level === 'approval_required') {
        // Governor can request, but needs Founder approval (simulated as ALLOW_WITH_AUDIT)
        return {
          action: 'ALLOW_WITH_AUDIT',
          reason: `APPROVAL_REQUIRED capability (${capabilityId}) marked for approval review`,
          approval_required: true,
        };
      }

      // Autonomous mission cannot use approval-required capability
      return {
        action: 'DENY',
        reason: `APPROVAL_REQUIRED capability (${capabilityId}) cannot be used by autonomous mission`,
        approval_required: true,
      };
    }

    // PROHIBITED capabilities never allowed
    if (dangerClass === 'PROHIBITED' || !dangerClass) {
      return {
        action: 'DENY',
        reason: `PROHIBITED or unknown capability (${capabilityId}) not allowed`,
        approval_required: false,
      };
    }

    // Default allow with audit
    return {
      action: 'ALLOW_WITH_AUDIT',
      reason: `Capability ${capabilityId} allowed with audit trail`,
      approval_required: requiresApproval,
    };
  }

  /**
   * Check command against security rules
   */
  private checkCommandSecurity(command: string): { allowed: boolean; reason: string } {
    // Check prohibited patterns
    for (const pattern of PolicyEngine.PROHIBITED_PATTERNS) {
      if (command.toLowerCase().includes(pattern)) {
        return {
          allowed: false,
          reason: `Prohibited pattern detected: ${pattern}`,
        };
      }
    }

    // Check for dangerous patterns
    for (const pattern of PolicyEngine.DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `Dangerous command pattern detected; requires explicit approval`,
        };
      }
    }

    // Check if command matches allowlist
    const allowedByAllowlist = PolicyEngine.ALLOWLIST.some((pattern) =>
      pattern.test(command)
    );

    if (!allowedByAllowlist) {
      return {
        allowed: false,
        reason: `Command not in allowlist (only npm, git, bash, npx allowed); use full path: ${command}`,
      };
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Check if action is prohibited (red-line violation)
   */
  async checkProhibitedAction(action: string): Promise<{ prohibited: boolean; reason?: string }> {
    for (const pattern of PolicyEngine.PROHIBITED_PATTERNS) {
      if (action.toLowerCase().includes(pattern)) {
        return {
          prohibited: true,
          reason: `Prohibited action: ${pattern}`,
        };
      }
    }

    return { prohibited: false };
  }

  /**
   * Get policy summary
   */
  getPolicySummary(): {
    safe_commands: string[];
    dangerous_commands: string[];
    prohibited_actions: string[];
  } {
    return {
      safe_commands: [
        'npm install/ci',
        'npm run lint/test/build/type-check',
        'git status/log/show/diff/checkout',
        'bash -c <simple-script>',
      ],
      dangerous_commands: [
        'rm -rf (recursive delete)',
        'docker commands (container ops)',
        'aws commands (cloud ops)',
        'curl with POST/PUT/DELETE',
      ],
      prohibited_actions: PolicyEngine.PROHIBITED_PATTERNS.slice(0, 10),
    };
  }
}

/**
 * Global policy engine instance
 */
let globalEngine: PolicyEngine | null = null;

/**
 * Get or create global policy engine
 */
export async function getOrCreatePolicyEngine(registry: CapabilityRegistry): Promise<PolicyEngine> {
  if (!globalEngine) {
    globalEngine = new PolicyEngine(registry);
  }
  return globalEngine;
}
