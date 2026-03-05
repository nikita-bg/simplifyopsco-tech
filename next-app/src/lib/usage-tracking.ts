/**
 * Usage Tracking Utilities
 *
 * Tracks conversation usage per business and handles overage charges
 */

import { createClient } from '@/lib/supabase/server';
import { createOverageInvoiceItem } from '@/lib/stripe/client';
import { calculateOverage, hasHitHardLimit, HARD_LIMIT_MULTIPLIER } from '@/lib/stripe/products';

/**
 * Increment conversation count for a business
 * Called after each voice conversation ends
 */
export async function incrementConversationCount(businessId: string): Promise<{
  success: boolean;
  newCount: number;
  limitReached: boolean;
  hardLimitReached: boolean;
}> {
  const supabase = await createClient();

  // Get current business data
  const { data: business, error } = await supabase
    .from('businesses')
    .select('conversation_count, conversation_limit, stripe_customer_id, plan_tier')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    console.error('[Usage] Error fetching business:', error);
    return { success: false, newCount: 0, limitReached: false, hardLimitReached: false };
  }

  const newCount = business.conversation_count + 1;
  const limit = business.conversation_limit;
  const hardLimit = limit * HARD_LIMIT_MULTIPLIER;

  // Check if hard limit reached (block further conversations)
  if (newCount >= hardLimit) {
    console.warn(`[Usage] Business ${businessId} hit hard limit (${hardLimit})`);
    return {
      success: false,
      newCount,
      limitReached: true,
      hardLimitReached: true,
    };
  }

  // Increment count
  const { error: updateError } = await supabase
    .from('businesses')
    .update({
      conversation_count: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  if (updateError) {
    console.error('[Usage] Error updating count:', updateError);
    return { success: false, newCount, limitReached: false, hardLimitReached: false };
  }

  // Check if overage charges should be applied
  if (newCount > limit && business.stripe_customer_id) {
    await handleOverageCharge(business.stripe_customer_id, newCount, limit);
  }

  return {
    success: true,
    newCount,
    limitReached: newCount >= limit,
    hardLimitReached: false,
  };
}

/**
 * Handle overage charge creation
 */
async function handleOverageCharge(
  customerId: string,
  conversationCount: number,
  limit: number
): Promise<void> {
  const overage = conversationCount - limit;

  // Only charge for conversations beyond limit
  if (overage <= 0) return;

  const amount = overage * 0.5; // $0.50 per conversation

  try {
    await createOverageInvoiceItem({
      customerId,
      amount,
      description: `Overage charge: ${overage} conversation${overage > 1 ? 's' : ''} beyond plan limit`,
    });

    console.log(`[Usage] Created overage charge: $${amount.toFixed(2)} for ${overage} conversations`);
  } catch (error) {
    console.error('[Usage] Error creating overage charge:', error);
  }
}

/**
 * Reset monthly usage counter
 * Called by Stripe webhook on successful payment or via cron job
 */
export async function resetMonthlyUsage(businessId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('businesses')
    .update({
      conversation_count: 0,
      billing_period_start: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  if (error) {
    console.error('[Usage] Error resetting usage:', error);
    return false;
  }

  console.log(`[Usage] Reset monthly usage for business ${businessId}`);
  return true;
}

/**
 * Check if business can start new conversation
 */
export async function canStartConversation(businessId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from('businesses')
    .select('conversation_count, conversation_limit, is_active, status')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    return { allowed: false, reason: 'Business not found' };
  }

  // Check if business is active
  if (!business.is_active || business.status !== 'active') {
    return { allowed: false, reason: 'Account suspended. Please update payment method.' };
  }

  // Check hard limit
  if (hasHitHardLimit(business.conversation_count, business.conversation_limit)) {
    return {
      allowed: false,
      reason: `Usage limit exceeded. You've reached ${business.conversation_count} of ${business.conversation_limit * HARD_LIMIT_MULTIPLIER} conversations (2x plan limit). Please upgrade your plan.`,
    };
  }

  return { allowed: true };
}
