import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Stripe from 'stripe';
import {
  createStripeCustomer,
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  getInvoices,
  stripe,
  constructWebhookEvent,
} from '@/lib/billing/stripe-client';

vi.mock('stripe', () => ({
  default: vi.fn(function (this: any) {
    return {
      customers: { create: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
      subscriptions: { retrieve: vi.fn(), update: vi.fn() },
      invoices: { list: vi.fn() },
      webhooks: { constructEvent: vi.fn() },
    };
  }),
}));

describe('Stripe Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createStripeCustomer', () => {
    it('should create a new Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        metadata: { customerId: 'customer-123' },
      };

      vi.spyOn(stripe.customers, 'create').mockResolvedValueOnce(
        mockCustomer as any
      );

      const result = await createStripeCustomer(
        'test@example.com',
        'customer-123'
      );

      expect(result.id).toBe('cus_test123');
      expect(result.email).toBe('test@example.com');
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { customerId: 'customer-123' },
      });
    });

    it('should attach metadata with customer ID', async () => {
      const mockCustomer = {
        id: 'cus_test456',
        email: 'user@example.com',
        metadata: { customerId: 'user-456' },
      };

      vi.spyOn(stripe.customers, 'create').mockResolvedValueOnce(
        mockCustomer as any
      );

      await createStripeCustomer('user@example.com', 'user-456');

      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: 'user@example.com',
        metadata: { customerId: 'user-456' },
      });
    });

    it('should handle duplicate customer creation error', async () => {
      const duplicateError = new Error('Customer already exists');

      vi.spyOn(stripe.customers, 'create').mockRejectedValueOnce(
        duplicateError
      );

      await expect(
        createStripeCustomer('duplicate@example.com', 'dup-123')
      ).rejects.toThrow('Customer already exists');
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session', async () => {
      const mockSession = {
        id: 'cs_test123',
        customer: 'cus_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
      };

      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValueOnce(
        mockSession as any
      );

      const result = await createCheckoutSession(
        'cus_test123',
        'price_test123',
        'http://localhost:3000/success',
        'http://localhost:3000/cancel'
      );

      expect(result.id).toBe('cs_test123');
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        line_items: [{ price: 'price_test123', quantity: 1 }],
        mode: 'subscription',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
      });
    });

    it('should set correct success and cancel URLs', async () => {
      const mockSession = {
        id: 'cs_test456',
        customer: 'cus_test456',
      };

      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValueOnce(
        mockSession as any
      );

      const successUrl = 'https://app.example.com/checkout/success';
      const cancelUrl = 'https://app.example.com/checkout/cancel';

      await createCheckoutSession(
        'cus_test456',
        'price_pro',
        successUrl,
        cancelUrl
      );

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: successUrl,
          cancel_url: cancelUrl,
        })
      );
    });

    it('should include price ID in line items', async () => {
      const mockSession = { id: 'cs_test789' };

      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValueOnce(
        mockSession as any
      );

      await createCheckoutSession(
        'cus_test789',
        'price_pro_monthly',
        'http://success',
        'http://cancel'
      );

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
        })
      );
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription details', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1620000000,
        current_period_end: 1622592000,
      };

      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValueOnce(
        mockSubscription as any
      );

      const result = await getSubscription('sub_test123');

      expect(result.id).toBe('sub_test123');
      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123');
    });

    it('should handle non-existent subscription error', async () => {
      const notFoundError = new Error('No such subscription');
      (notFoundError as any).code = 'resource_missing';

      vi.spyOn(stripe.subscriptions, 'retrieve').mockRejectedValueOnce(
        notFoundError
      );

      await expect(getSubscription('sub_nonexistent')).rejects.toThrow(
        'No such subscription'
      );
    });

    it('should return subscription with all required fields', async () => {
      const mockSubscription = {
        id: 'sub_complete',
        customer: 'cus_complete',
        status: 'active',
        current_period_start: 1620000000,
        current_period_end: 1622592000,
        cancel_at_period_end: false,
      };

      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValueOnce(
        mockSubscription as any
      );

      const result = await getSubscription('sub_complete');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('status');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end by default', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        cancel_at_period_end: true,
      };

      vi.spyOn(stripe.subscriptions, 'update').mockResolvedValueOnce(
        mockSubscription as any
      );

      await cancelSubscription('sub_test123');

      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });
    });

    it('should cancel immediately when atPeriodEnd is false', async () => {
      const mockSubscription = {
        id: 'sub_immediate',
        status: 'canceled',
        cancel_at_period_end: false,
      };

      vi.spyOn(stripe.subscriptions, 'update').mockResolvedValueOnce(
        mockSubscription as any
      );

      await cancelSubscription('sub_immediate', false);

      expect(stripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_immediate',
        {
          cancel_at_period_end: false,
        }
      );
    });

    it('should return updated subscription', async () => {
      const mockSubscription = {
        id: 'sub_return_test',
        status: 'active',
        cancel_at_period_end: true,
      };

      vi.spyOn(stripe.subscriptions, 'update').mockResolvedValueOnce(
        mockSubscription as any
      );

      const result = await cancelSubscription('sub_return_test');

      expect(result.id).toBe('sub_return_test');
      expect(result.cancel_at_period_end).toBe(true);
    });
  });

  describe('getInvoices', () => {
    it('should retrieve customer invoices', async () => {
      const mockInvoices = {
        object: 'list',
        data: [
          { id: 'inv_test1', amount_paid: 4900, status: 'paid' },
          { id: 'inv_test2', amount_paid: 4900, status: 'paid' },
        ],
        has_more: false,
      };

      vi.spyOn(stripe.invoices, 'list').mockResolvedValueOnce(
        mockInvoices as any
      );

      const result = await getInvoices('cus_test123');

      expect(result.data).toHaveLength(2);
      expect(stripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_test123',
        limit: 10,
      });
    });

    it('should handle pagination with limit', async () => {
      const mockInvoices = {
        object: 'list',
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `inv_page${i}`,
          amount_paid: 4900,
          status: 'paid',
        })),
        has_more: true,
      };

      vi.spyOn(stripe.invoices, 'list').mockResolvedValueOnce(
        mockInvoices as any
      );

      const result = await getInvoices('cus_pagination');

      expect(result.data).toHaveLength(10);
      expect(result.has_more).toBe(true);
      expect(stripe.invoices.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      );
    });

    it('should return empty list when no invoices exist', async () => {
      const mockInvoices = {
        object: 'list',
        data: [],
        has_more: false,
      };

      vi.spyOn(stripe.invoices, 'list').mockResolvedValueOnce(
        mockInvoices as any
      );

      const result = await getInvoices('cus_no_invoices');

      expect(result.data).toHaveLength(0);
    });
  });

  describe('constructWebhookEvent', () => {
    const testSignature = 'test_signature_123';
    const testBody = JSON.stringify({ type: 'customer.subscription.created' });

    it('should parse valid webhook event', () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_test123' } },
      };

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValueOnce(
        mockEvent as any
      );

      const result = constructWebhookEvent(testBody, testSignature);

      expect(result.type).toBe('customer.subscription.created');
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        testBody,
        testSignature,
        expect.any(String)
      );
    });

    it('should reject invalid signature', () => {
      const signatureError = new Error('No matching signing secret found');

      vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementationOnce(() => {
        throw signatureError;
      });

      expect(() =>
        constructWebhookEvent(testBody, 'invalid_signature')
      ).toThrow('No matching signing secret found');
    });

    it('should handle subscription.created event', () => {
      const mockEvent = {
        id: 'evt_sub_created',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_created123', status: 'active' } },
      };

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValueOnce(
        mockEvent as any
      );

      const result = constructWebhookEvent(testBody, testSignature);

      expect(result.type).toBe('customer.subscription.created');
      expect(result.data.object).toHaveProperty('id');
    });

    it('should handle invoice.payment_succeeded event', () => {
      const mockEvent = {
        id: 'evt_inv_paid',
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'inv_paid123', status: 'paid' } },
      };

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValueOnce(
        mockEvent as any
      );

      const result = constructWebhookEvent(testBody, testSignature);

      expect(result.type).toBe('invoice.payment_succeeded');
    });

    it('should throw error when webhook secret is missing', () => {
      const originalEnv = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      expect(() => constructWebhookEvent(testBody, testSignature)).toThrow(
        'STRIPE_WEBHOOK_SECRET environment variable is required'
      );

      process.env.STRIPE_WEBHOOK_SECRET = originalEnv;
    });
  });
});
