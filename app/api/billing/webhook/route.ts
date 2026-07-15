import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/billing/stripe-client';
import { getSupabaseAdmin } from '@/lib/supabase';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const event = constructWebhookEvent(body, signature);

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = (subscription.metadata as Record<string, string>)
    ?.customerId;
  if (!customerId) return;

  const supabase = getSupabaseAdmin();
  // Note: Stripe subscription has current_period_start, current_period_end as numbers
  const startTime = (
    subscription as unknown as {
      current_period_start: number;
    }
  ).current_period_start;
  const endTime = (subscription as unknown as { current_period_end: number })
    .current_period_end;
  const anchor = (subscription as unknown as { billing_cycle_anchor?: number })
    .billing_cycle_anchor;

  await supabase
    .from('customer_subscriptions')
    .upsert({
      customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(startTime * 1000).toISOString(),
      current_period_end: new Date(endTime * 1000).toISOString(),
      billing_cycle_anchor: anchor
        ? new Date(anchor * 1000).toISOString()
        : null,
    })
    .select();
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = (subscription.metadata as Record<string, string>)
    ?.customerId;
  if (!customerId) return;

  const supabase = getSupabaseAdmin();
  const startTime = (
    subscription as unknown as {
      current_period_start: number;
    }
  ).current_period_start;
  const endTime = (subscription as unknown as { current_period_end: number })
    .current_period_end;

  await supabase
    .from('customer_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(startTime * 1000).toISOString(),
      current_period_end: new Date(endTime * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .select();
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.metadata?.customerId;
  if (!customerId) return;

  const supabase = getSupabaseAdmin();
  await supabase
    .from('customer_subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id)
    .select();
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const inv = invoice as unknown as { subscription?: string };
  if (!inv.subscription || typeof inv.subscription !== 'string') return;

  const supabase = getSupabaseAdmin();
  const { data: subscription } = await supabase
    .from('customer_subscriptions')
    .select('customer_id')
    .eq('stripe_subscription_id', inv.subscription)
    .single();

  if (!subscription) return;

  const invExt = invoice as unknown as {
    amount_paid?: number;
    paid_at?: number;
  };
  await supabase
    .from('invoices')
    .upsert({
      customer_id: subscription.customer_id,
      subscription_id: inv.subscription,
      stripe_invoice_id: invoice.id,
      amount_paid: invExt.amount_paid ? invExt.amount_paid / 100 : 0,
      status: 'paid',
      paid_at: invExt.paid_at
        ? new Date(invExt.paid_at * 1000).toISOString()
        : null,
    })
    .select();
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as unknown as { subscription?: string };
  if (!inv.subscription || typeof inv.subscription !== 'string') return;

  const supabase = getSupabaseAdmin();
  const { data: subscription } = await supabase
    .from('customer_subscriptions')
    .select('customer_id')
    .eq('stripe_subscription_id', inv.subscription)
    .single();

  if (!subscription) return;

  const invExt = invoice as unknown as { paid_at?: number };
  await supabase
    .from('invoices')
    .upsert({
      customer_id: subscription.customer_id,
      subscription_id: inv.subscription,
      stripe_invoice_id: invoice.id,
      amount_paid: 0,
      status: 'open',
      paid_at: null,
    })
    .select();
}
