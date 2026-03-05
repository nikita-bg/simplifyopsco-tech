/**
 * Cost Analytics API
 *
 * Returns AI provider cost analytics for the business
 *
 * GET /api/analytics/costs?days=30
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBusinessCosts } from '@/lib/cost-tracking'

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
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (businessError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Get days parameter
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30')

  // Fetch cost analytics
  const costs = await getBusinessCosts(business.id, days)

  if (!costs) {
    return NextResponse.json({ error: 'Failed to fetch cost data' }, { status: 500 })
  }

  return NextResponse.json(costs)
}
