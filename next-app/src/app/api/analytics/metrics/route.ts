/**
 * Metrics Analytics API
 *
 * Returns latency and error metrics for the business
 *
 * GET /api/analytics/metrics?days=7&hours=24
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLatencyPercentiles, getErrorStats, getHourlyLatency } from '@/lib/metrics-tracking'

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

  // Get query parameters
  const days = parseInt(request.nextUrl.searchParams.get('days') || '7')
  const hours = parseInt(request.nextUrl.searchParams.get('hours') || '24')

  // Fetch metrics
  const [latency, errors, hourly] = await Promise.all([
    getLatencyPercentiles(business.id, days),
    getErrorStats(business.id, days),
    getHourlyLatency(business.id, hours),
  ])

  if (!latency || !errors) {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }

  return NextResponse.json({
    latency,
    errors,
    hourly,
  })
}
