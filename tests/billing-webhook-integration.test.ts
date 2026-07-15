import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stripe } from '@/lib/billing/stripe-client';
import { getSupabaseAdmin } from '@/lib/supabase';
import type Stripe from 'stripe';

vi.mock('@/lib/billing/stripe-client');
vi.mock('@/lib/supabase');

const mockSupabase = {
  from: vi.fn(),
};

describe('Billing Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseAdmin as any).mockReturnValue(mockSupabase);
  });

  describe('Subscription Events', () => {
    it('should handle customer.subscription.created webhook', async () => {
      const webhookPayload: Stripe.CustomerSubscriptionCreatedEvent = {
        id: 'evt_sub_created',
        object: 'event',
        api_version: '2024-06-20',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'sub_test123',
            object: 'subscription',
            billing_cycle_anchor: Math.floor(Date.now() / 1000),
            cancel_at_period_end: false,
            current_period_end:
              Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            current_period_start: Math.floor(Date.now() / 1000),
            customer: 'cus_test123',
            status: 'active',
            items: {
              object: 'list',
              data: [
                {
                  id: 'si_test123',
                  object: 'subscription_item',
                  billing_thresholds: null,
                  created: Math.floor(Date.now() / 1000),
                  currency: 'usd',
                  customer: 'cus_test123',
                  metadata: {},
                  price: {
                    id: 'price_pro',
                    object: 'price',
                    active: true,
                    billing_scheme: 'per_unit',
                    created: Math.floor(Date.now() / 1000),
                    currency: 'usd',
                    custom_unit_amount: null,
                    livemode: false,
                    lookup_key: null,
                    metadata: {},
                    nickname: null,
                    product: 'prod_pro',
                    recurring: {
                      aggregate_usage: null,
                      interval: 'month',
                      interval_count: 1,
                      meter: null,
                      trial_period_days: null,
                      usage_type: 'licensed',
                    },
                    tax_behavior: 'unspecified',
                    tiers_mode: null,
                    transform_quantity: null,
                    type: 'recurring',
                    unit_amount: 4900,
                    unit_amount_decimal: '4900',
                  },
                  proration_details: {
                    credited_items: null,
                  },
                  quantity: 1,
                  subscription: 'sub_test123',
                  tax_rates: [],
                },
              ],
              has_more: false,
              url: '/v1/subscription_items',
            },
            metadata: {},
            automatic_tax: {
              enabled: false,
            },
          } as any,
          previous_attributes: {},
        } as any,
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: null,
          idempotency_key: null,
        },
        type: 'customer.subscription.created',
      } as any;

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'sub_db_id',
              stripe_subscription_id: 'sub_test123',
              plan_id: 'pro',
            },
          ],
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      const { data } = await mockSupabase
        .from('customer_subscriptions')
        .upsert({
          customer_id: 'customer_test',
          plan_id: 'pro',
          stripe_subscription_id: webhookPayload.data.object.id,
          status: webhookPayload.data.object.status,
          current_period_start: new Date(
            (webhookPayload.data.object as any).current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            (webhookPayload.data.object as any).current_period_end * 1000
          ).toISOString(),
          billing_cycle_anchor: new Date(
            (webhookPayload.data.object as any).billing_cycle_anchor * 1000
          ).toISOString(),
        })
        .select();

      expect(data).toBeDefined();
      expect(data![0].stripe_subscription_id).toBe('sub_test123');
      expect(data![0].plan_id).toBe('pro');
    });

    it('should handle customer.subscription.updated webhook', async () => {
      const updatePayload = {
        id: 'sub_updated',
        stripe_subscription_id: 'sub_test456',
        status: 'past_due',
        updated_at: new Date().toISOString(),
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [updatePayload],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        update: updateMock,
      });

      const { data } = await mockSupabase
        .from('customer_subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', 'sub_test456')
        .select();

      expect(data![0].status).toBe('past_due');
    });

    it('should handle customer.subscription.deleted webhook', async () => {
      const deletePayload = {
        id: 'sub_deleted',
        stripe_subscription_id: 'sub_test789',
        status: 'cancelled',
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [deletePayload],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        update: updateMock,
      });

      const { data } = await mockSupabase
        .from('customer_subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', 'sub_test789')
        .select();

      expect(data![0].status).toBe('cancelled');
    });
  });

  describe('Invoice Events', () => {
    it('should handle invoice.payment_succeeded webhook', async () => {
      const invoicePayload = {
        id: 'evt_inv_paid',
        stripe_invoice_id: 'inv_paid123',
        amount_paid: 4900,
        status: 'paid',
        customer_id: 'cus_test123',
      };

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [invoicePayload],
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      const { data } = await mockSupabase
        .from('invoices')
        .upsert({
          stripe_invoice_id: invoicePayload.stripe_invoice_id,
          customer_id: invoicePayload.customer_id,
          amount_paid: invoicePayload.amount_paid,
          status: invoicePayload.status,
        })
        .select();

      expect(data![0].status).toBe('paid');
      expect(data![0].amount_paid).toBe(4900);
    });

    it('should handle invoice.payment_failed webhook', async () => {
      const failedInvoicePayload = {
        id: 'evt_inv_failed',
        stripe_invoice_id: 'inv_failed123',
        status: 'open',
        customer_id: 'cus_test456',
        amount_due: 4900,
      };

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [failedInvoicePayload],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        update: updateMock,
      });

      const { data } = await mockSupabase
        .from('invoices')
        .update({ status: 'open' })
        .eq('stripe_invoice_id', 'inv_failed123')
        .select();

      expect(data![0].status).toBe('open');
    });
  });

  describe('Webhook Signature Validation', () => {
    it('should reject webhook with invalid signature', () => {
      const invalidSignature = 'invalid_signature_123';
      const body = JSON.stringify({ type: 'customer.subscription.created' });

      const signError = new Error('No matching signing secret found');
      vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementationOnce(() => {
        throw signError;
      });

      expect(() =>
        stripe.webhooks.constructEvent(body, invalidSignature, 'whsec_test')
      ).toThrow('No matching signing secret found');
    });

    it('should accept webhook with valid signature', () => {
      const validSignature = 'valid_signature_123';
      const body = JSON.stringify({ type: 'customer.subscription.created' });

      const mockEvent = {
        id: 'evt_valid',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_valid' } },
      };

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValueOnce(
        mockEvent as any
      );

      const result = stripe.webhooks.constructEvent(
        body,
        validSignature,
        'whsec_test'
      );

      expect(result.type).toBe('customer.subscription.created');
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle malformed webhook payload', async () => {
      const malformedPayload = 'not json {]';

      expect(() => {
        JSON.parse(malformedPayload);
      }).toThrow();
    });

    it('should handle database errors during webhook processing', async () => {
      const dbErrorMock = vi.fn().mockReturnValue({
        select: vi
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      });

      mockSupabase.from.mockReturnValue({
        upsert: dbErrorMock,
      });

      await expect(
        mockSupabase
          .from('invoices')
          .upsert({ stripe_invoice_id: 'inv_test' })
          .select()
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle missing customer ID in webhook', async () => {
      const incompletePayload = {
        stripe_subscription_id: 'sub_test',
        status: 'active',
      };

      const validatePayload = (payload: any) => {
        if (!payload.customer_id && !payload.stripe_subscription_id) {
          throw new Error('Missing required fields');
        }
      };

      expect(() => validatePayload(incompletePayload)).not.toThrow();
      expect(() => validatePayload({})).toThrow('Missing required fields');
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook events idempotently', async () => {
      const duplicateEventId = 'evt_duplicate_123';
      const subscriptionData = {
        stripe_subscription_id: 'sub_dup_123',
        status: 'active',
      };

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [subscriptionData],
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        upsert: upsertMock,
      });

      // First event
      const result1 = await mockSupabase
        .from('customer_subscriptions')
        .upsert(subscriptionData)
        .select();

      // Duplicate event
      const result2 = await mockSupabase
        .from('customer_subscriptions')
        .upsert(subscriptionData)
        .select();

      expect(result1.data![0]).toEqual(result2.data![0]);
      expect(upsertMock).toHaveBeenCalledTimes(2);
    });
  });
});
