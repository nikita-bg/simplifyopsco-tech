/**
 * Orders API
 * GET: List orders for current business (read-only, synced from platform)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const search = request.nextUrl.searchParams.get('search');
  const status = request.nextUrl.searchParams.get('status');

  let query = supabase
    .from('orders')
    .select('id, order_number, customer_email, customer_name, status, financial_status, fulfillment_status, tracking_number, tracking_url, total_price, currency, line_items, order_date, shipped_at, synced_at, created_at')
    .eq('business_id', business.id)
    .order('order_date', { ascending: false });

  if (search) {
    query = query.or(`customer_email.ilike.%${search}%,order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: orders, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({ orders: orders || [] });
}
