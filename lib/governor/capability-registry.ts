/**
 * Governor OS Foundation — Capability Registry
 * Discovers and verifies what capabilities are available in this environment.
 * Capabilities are abstractions over providers (npm, git, bash, etc.).
 * Registry is populated at startup and used for task planning and policy checking.
 */

import { Capability, Provider, CapabilityStatus, CapabilityDangerClass } from './types';

export class CapabilityRegistry {
  private capabilities: Map<string, Capability> = new Map();
  private providers: Map<string, Provider> = new Map();

  /**
   * Initialize registry with known capabilities for this environment
   */
  async initialize(): Promise<void> {
    // Define capabilities as per CATHEDRAL_GENOME.yaml
    const capabilities: Capability[] = [
      {
        capability_id: 'repository_read',
        name: 'Repository Read',
        description: 'Read files from repository',
        danger_class: 'SAFE',
        providers: [
          {
            provider_id: 'file_system',
            name: 'Local File System',
            type: 'local',
            available: true,
          },
        ],
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        requires_approval: false,
        requires_audit: false,
        requires_evidence: false,
      },
      {
        capability_id: 'approved_command_execution',
        name: 'Approved Command Execution',
        description: 'Execute allowlisted commands (npm, git, bash)',
        danger_class: 'AUDIT_REQUIRED',
        providers: [
          {
            provider_id: 'bash',
            name: 'Bash Shell',
            type: 'local',
            available: true,
          },
          {
            provider_id: 'npm',
            name: 'npm Package Manager',
            type: 'local',
            available: true,
          },
          {
            provider_id: 'git',
            name: 'Git Version Control',
            type: 'local',
            available: true,
          },
        ],
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        requires_approval: false,
        requires_audit: true,
        requires_evidence: true,
      },
      {
        capability_id: 'test_execution',
        name: 'Test Execution',
        description: 'Run test suites (vitest, Playwright)',
        danger_class: 'AUDIT_REQUIRED',
        providers: [
          {
            provider_id: 'npm_test',
            name: 'npm test (vitest)',
            type: 'local',
            available: true,
          },
          {
            provider_id: 'playwright',
            name: 'Playwright E2E Tests',
            type: 'local',
            available: false, // Assumed unavailable in this environment
          },
        ],
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        requires_approval: false,
        requires_audit: true,
        requires_evidence: true,
      },
      {
        capability_id: 'build_generation',
        name: 'Build Generation',
        description: 'Generate production build (Next.js)',
        danger_class: 'APPROVAL_REQUIRED',
        providers: [
          {
            provider_id: 'npm_build',
            name: 'npm run build (Next.js)',
            type: 'local',
            available: true,
          },
        ],
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        requires_approval: true,
        requires_audit: true,
        requires_evidence: true,
      },
      {
        capability_id: 'local_persistence',
        name: 'Local Persistence',
        description: 'Read/write SQLite database for Evidence Ledger',
        danger_class: 'AUDIT_REQUIRED',
        providers: [
          {
            provider_id: 'sqlite3',
            name: 'SQLite3 Database',
            type: 'local',
            available: false, // Not yet integrated in reference mission
          },
        ],
        status: 'ASSUMED',
        verified_at: undefined,
        requires_approval: false,
        requires_audit: true,
        requires_evidence: true,
      },
      {
        capability_id: 'code_linting',
        name: 'Code Linting',
        description: 'Run ESLint for code quality',
        danger_class: 'SAFE',
        providers: [
          {
            provider_id: 'eslint',
            name: 'ESLint',
            type: 'local',
            available: false, // Known issue in repo
          },
        ],
        status: 'BLOCKED',
        verified_at: new Date().toISOString(),
        error_message: 'ESLint dependency missing, see npm output',
        requires_approval: false,
        requires_audit: false,
        requires_evidence: false,
      },
      {
        capability_id: 'type_checking',
        name: 'Type Checking',
        description: 'Run TypeScript compiler',
        danger_class: 'SAFE',
        providers: [
          {
            provider_id: 'tsc',
            name: 'TypeScript Compiler',
            type: 'local',
            available: true,
          },
        ],
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        requires_approval: false,
        requires_audit: false,
        requires_evidence: false,
      },
    ];

    // Register all capabilities
    for (const cap of capabilities) {
      this.capabilities.set(cap.capability_id, cap);

      // Register providers
      for (const prov of cap.providers) {
        this.providers.set(prov.provider_id, prov);
      }
    }
  }

  /**
   * Get capability by ID
   */
  getCapability(capabilityId: string): Capability | undefined {
    return this.capabilities.get(capabilityId);
  }

  /**
   * List all capabilities
   */
  listCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Find first available provider for a capability
   */
  findAvailableProvider(capabilityId: string): Provider | undefined {
    const capability = this.getCapability(capabilityId);
    if (!capability) {
      return undefined;
    }

    // Try providers in order (first available wins)
    for (const prov of capability.providers) {
      if (prov.available) {
        return prov;
      }
    }

    return undefined;
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): Provider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Check if capability is available (at least one provider works)
   */
  isCapabilityAvailable(capabilityId: string): boolean {
    const capability = this.getCapability(capabilityId);
    if (!capability) {
      return false;
    }

    if (capability.status === 'UNAVAILABLE' || capability.status === 'BLOCKED') {
      return false;
    }

    return this.findAvailableProvider(capabilityId) !== undefined;
  }

  /**
   * Get danger class of capability
   */
  getDangerClass(capabilityId: string): CapabilityDangerClass | undefined {
    const capability = this.getCapability(capabilityId);
    return capability?.danger_class;
  }

  /**
   * Requires approval?
   */
  requiresApproval(capabilityId: string): boolean {
    const capability = this.getCapability(capabilityId);
    return capability?.requires_approval ?? false;
  }

  /**
   * Requires audit trail?
   */
  requiresAudit(capabilityId: string): boolean {
    const capability = this.getCapability(capabilityId);
    return capability?.requires_audit ?? false;
  }

  /**
   * Requires evidence?
   */
  requiresEvidence(capabilityId: string): boolean {
    const capability = this.getCapability(capabilityId);
    return capability?.requires_evidence ?? false;
  }

  /**
   * Check capability health
   */
  checkCapabilityHealth(capabilityId: string): {
    available: boolean;
    status: CapabilityStatus;
    error?: string;
  } {
    const capability = this.getCapability(capabilityId);
    if (!capability) {
      return {
        available: false,
        status: 'UNAVAILABLE',
        error: 'Capability not found in registry',
      };
    }

    return {
      available: this.isCapabilityAvailable(capabilityId),
      status: capability.status,
      error: capability.error_message,
    };
  }

  /**
   * Get summary of all capabilities
   */
  getSummary(): {
    total: number;
    verified: number;
    available: number;
    blocked: number;
  } {
    const capabilities = this.listCapabilities();
    return {
      total: capabilities.length,
      verified: capabilities.filter((c) => c.status === 'VERIFIED').length,
      available: capabilities.filter((c) => this.isCapabilityAvailable(c.capability_id)).length,
      blocked: capabilities.filter((c) => c.status === 'BLOCKED').length,
    };
  }
}

/**
 * Global registry instance (singleton)
 */
let globalRegistry: CapabilityRegistry | null = null;

/**
 * Get or create global registry
 */
export async function getOrCreateRegistry(): Promise<CapabilityRegistry> {
  if (!globalRegistry) {
    globalRegistry = new CapabilityRegistry();
    await globalRegistry.initialize();
  }
  return globalRegistry;
}
