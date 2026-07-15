import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import {
  createCheckoutSession,
  createStripeCustomer,
} from '@/lib/billing/stripe-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await request.json();

    if (!planId || !['pro', 'enterprise'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = customer?.stripe_customer_id;

    if (!stripeCustomerId) {
      const stripeCustomer = await createStripeCustomer(user.email, user.id);
      stripeCustomerId = stripeCustomer.id;

      await supabase
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
        .select();
    }

    const successUrl = `${new URL(request.url).origin}/settings/billing?success=true`;
    const cancelUrl = `${new URL(request.url).origin}/settings/billing?canceled=true`;

    const stripeSession = await createCheckoutSession(
      stripeCustomerId,
      process.env[`STRIPE_PRICE_ID_${planId.toUpperCase()}`] || '',
      successUrl,
      cancelUrl
    );

    return NextResponse.json({ sessionId: stripeSession.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
