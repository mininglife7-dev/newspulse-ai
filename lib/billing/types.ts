export type BillingTier = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus =
  'active' | 'past_due' | 'cancelled' | 'paused' | 'trialing';

export type InvoiceStatus =
  'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface BillingPlan {
  id: string;
  name: string;
  tier: BillingTier;
  priceMonthly: number | null;
  features: Record<string, boolean>;
  apiRateLimit: number;
  maxWorkspaces: number;
  maxTeamMembers: number;
  createdAt: string;
}

export interface CustomerSubscription {
  id: string;
  customerId: string;
  planId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  billingCycleAnchor: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageTracking {
  id: string;
  customerId: string;
  subscriptionId: string;
  periodMonth: string;
  apiCalls: number;
  workspacesCreated: number;
  teamMembersInvited: number;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amountPaid: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account';
  lastFour: string;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface UsageStats {
  currentPeriodApiCalls: number;
  currentPeriodWorkspaces: number;
  currentPeriodTeamMembers: number;
  percentageUsed: number;
  daysRemaining: number;
}

export interface BillingContext {
  subscription: CustomerSubscription;
  plan: BillingPlan;
  usage: UsageStats;
  invoice?: Invoice;
}
