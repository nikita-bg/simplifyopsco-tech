/**
 * Stripe Checkout API
 *
 * Creates a Stripe Checkout session for subscription upgrade
 *
 * POST /api/billing/checkout
 * Body: { priceId: string, tier: PlanTier }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, createStripeCustomer } from '@/lib/stripe/client';
import { getPlanDetails, type PlanTier } from '@/lib/stripe/products';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get request body
  const { tier } = await request.json();

  if (!tier || !(tier in { free: 1, starter: 1, pro: 1, business: 1, enterprise: 1 })) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const planDetails = getPlanDetails(tier as PlanTier);

  if (!planDetails.priceId) {
    return NextResponse.json(
      { error: 'This plan does not support self-serve checkout. Please contact sales.' },
      { status: 400 }
    );
  }

  // 3. Get user's business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (businessError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // 4. Create or get Stripe customer
  let customerId = business.stripe_customer_id;

  if (!customerId) {
    try {
      const customer = await createStripeCustomer({
        email: user.email!,
        name: business.name,
        businessId: business.id,
      });

      customerId = customer.id;

      // Update business with customer ID
      await supabase
        .from('businesses')
        .update({ stripe_customer_id: customerId })
        .eq('id', business.id);
    } catch (error) {
      console.error('[Checkout] Error creating customer:', error);
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }
  }

  // 5. Create checkout session
  try {
    const session = await createCheckoutSession({
      customerId,
      priceId: planDetails.priceId,
      businessId: business.id,
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?checkout=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?checkout=cancel`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Checkout] Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
