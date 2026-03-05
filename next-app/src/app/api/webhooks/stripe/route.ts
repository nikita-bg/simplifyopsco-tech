/**
 * Stripe Webhook Handler
 *
 * Processes Stripe events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 *
 * POST /api/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error('[Stripe Webhook] Signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[Stripe Webhook] Event received:', event.type);

  // Handle event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata.business_id;

  if (!businessId) {
    console.error('[Stripe] No business_id in subscription metadata');
    return;
  }

  // Determine plan tier from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let planTier = 'free';

  if (priceId === process.env.STRIPE_PRICE_STARTER) planTier = 'starter';
  else if (priceId === process.env.STRIPE_PRICE_PRO) planTier = 'pro';
  else if (priceId === process.env.STRIPE_PRICE_BUSINESS) planTier = 'business';

  // Get conversation limit for new tier
  const limits: Record<string, number> = {
    free: 25,
    starter: 500,
    pro: 2500,
    business: 10000,
    enterprise: -1,
  };

  const supabase = await createClient();

  // Update business
  await supabase
    .from('businesses')
    .update({
      plan_tier: planTier,
      conversation_limit: limits[planTier],
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status === 'active' ? 'active' : 'suspended',
      is_active: subscription.status === 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  console.log(`[Stripe] Updated business ${businessId} to ${planTier} tier`);
}

/**
 * Handle subscription deleted (cancelled)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata.business_id;

  if (!businessId) return;

  const supabase = await createClient();

  // Downgrade to free tier
  await supabase
    .from('businesses')
    .update({
      plan_tier: 'free',
      conversation_limit: 25,
      stripe_subscription_id: null,
      status: 'cancelled',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  console.log(`[Stripe] Cancelled subscription for business ${businessId}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const supabase = await createClient();

  // Find business by customer ID
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!business) return;

  // Reset conversation count for new billing period
  await supabase
    .from('businesses')
    .update({
      conversation_count: 0,
      billing_period_start: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', business.id);

  console.log(`[Stripe] Payment succeeded for business ${business.id}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const supabase = await createClient();

  // Find business by customer ID
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!business) return;

  // Suspend business
  await supabase
    .from('businesses')
    .update({
      status: 'suspended',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', business.id);

  console.error(`[Stripe] Payment failed for business ${business.id} - suspended`);

  // TODO: Send email notification to business owner
}
