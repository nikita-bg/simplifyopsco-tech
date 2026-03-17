/**
 * Integration Status API
 * GET /api/integrations/status
 *
 * Returns current integration status for the authenticated business.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Get store connection
  const { data: connection } = await supabase
    .from('store_connections')
    .select('platform, shop_domain, is_active, installed_at, updated_at')
    .eq('business_id', business.id)
    .single();

  if (!connection) {
    return NextResponse.json({
      connected: false,
      platform: null,
      shopDomain: null,
      productCount: 0,
      orderCount: 0,
      lastSync: null,
    });
  }

  // Get product count
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  // Get order count
  const { count: orderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  // Get last successful sync
  const { data: lastSync } = await supabase
    .from('sync_logs')
    .select('completed_at, products_synced, orders_synced, status')
    .eq('business_id', business.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    connected: connection.is_active,
    platform: connection.platform,
    shopDomain: connection.shop_domain,
    installedAt: connection.installed_at,
    productCount: productCount ?? 0,
    orderCount: orderCount ?? 0,
    lastSync: lastSync ? {
      completedAt: lastSync.completed_at,
      productsSynced: lastSync.products_synced,
      ordersSynced: lastSync.orders_synced,
    } : null,
  });
}
