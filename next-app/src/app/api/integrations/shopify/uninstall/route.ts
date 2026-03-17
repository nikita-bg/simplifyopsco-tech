/**
 * Shopify App Uninstall Webhook
 * POST /api/integrations/shopify/uninstall
 *
 * Called by Shopify when a merchant uninstalls the app.
 * Deletes store connection and all synced data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac } from 'crypto';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;

function verifyWebhookHmac(body: string, hmacHeader: string): boolean {
  const digest = createHmac('sha256', SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  return digest === hmacHeader;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');

  if (!hmac || !verifyWebhookHmac(body, hmac)) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const shopDomain = request.headers.get('x-shopify-shop-domain');

  if (!shopDomain) {
    return NextResponse.json({ error: 'Missing shop domain' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find the connection by shop domain
  const { data: connection } = await admin
    .from('store_connections')
    .select('id, business_id')
    .eq('shop_domain', shopDomain)
    .single();

  if (!connection) {
    // Already uninstalled or never existed — OK
    return NextResponse.json({ ok: true });
  }

  // Delete synced data: products, orders, sync_logs, then the connection
  await admin.from('products').delete().eq('business_id', connection.business_id);
  await admin.from('orders').delete().eq('business_id', connection.business_id);
  await admin.from('sync_logs').delete().eq('business_id', connection.business_id);
  await admin.from('store_connections').delete().eq('id', connection.id);

  console.log(`[Shopify Uninstall] Cleaned up data for shop: ${shopDomain}`);
  return NextResponse.json({ ok: true });
}
