/**
 * Billing Usage API
 *
 * Returns current usage and plan information for the business
 *
 * GET /api/billing/usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanDetails, calculateOverage, hasHitHardLimit, HARD_LIMIT_MULTIPLIER } from '@/lib/stripe/products'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (businessError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const planDetails = getPlanDetails(business.plan_tier as any)
  const overageCount = calculateOverage(business.conversation_count, business.conversation_limit)
  const hardLimit = business.conversation_limit * HARD_LIMIT_MULTIPLIER
  const hardLimitReached = hasHitHardLimit(business.conversation_count, business.conversation_limit)

  return NextResponse.json({
    plan: {
      tier: business.plan_tier,
      name: planDetails.name,
      price: planDetails.price,
      features: planDetails.features,
    },
    usage: {
      conversations: {
        current: business.conversation_count,
        limit: business.conversation_limit,
        hardLimit,
        percentage: Math.min(
          Math.round((business.conversation_count / business.conversation_limit) * 100),
          100
        ),
        overage: overageCount,
        overageCost: overageCount * 0.5,
        hardLimitReached,
      },
    },
    billing: {
      periodStart: business.billing_period_start,
      status: business.status,
      isActive: business.is_active,
      stripeCustomerId: business.stripe_customer_id,
      stripeSubscriptionId: business.stripe_subscription_id,
    },
  })
}
