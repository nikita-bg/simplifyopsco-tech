/**
 * Stripe Customer Portal API
 *
 * Creates a Stripe billing portal session for subscription management
 *
 * POST /api/billing/portal
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/stripe/client'

export async function POST(request: NextRequest) {
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
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .single()

  if (businessError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  if (!business.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No active subscription. Please upgrade to a paid plan first.' },
      { status: 400 }
    )
  }

  // Create portal session
  try {
    const session = await createPortalSession({
      customerId: business.stripe_customer_id,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('[Portal] Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
