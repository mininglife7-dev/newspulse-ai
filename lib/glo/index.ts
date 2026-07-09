/**
 * GLO — General Learning Organism.
 *
 * The shared learning genome beneath VAJRA, EURO AI, Governor, Founder Academy,
 * Sales, Support, and future organs. Import from here.
 *
 *   Machines execute. Tools solve. Products serve.
 *   Organisms learn. Cathedrals endure.
 *
 * See docs/governance/GLO_CONSTITUTION.md for the doctrine this code enforces.
 */

export * from './types';
export * from './confidence';
export { LearningGenome } from './genome';
export {
  ORGAN_REGISTRY,
  getOrgan,
  listOrgans,
  deriveMaturity,
  findFabricatedMaturity,
} from './organs';
export {
  recommendTransfers,
  recommendAllTransfers,
  decideTransfer,
} from './transfer';
export { buildDashboardBlock } from './dashboard';
export type { DashboardBlock, OrganSummary } from './dashboard';
export { buildSeededGenome, SEED_AT } from './seed';
