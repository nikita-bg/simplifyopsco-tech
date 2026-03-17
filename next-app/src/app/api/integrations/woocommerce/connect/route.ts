/**
 * WooCommerce Connect API
 * POST /api/integrations/woocommerce/connect
 *
 * Validates WooCommerce API keys by making a test request,
 * then encrypts and saves the connection.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { siteUrl, consumerKey, consumerSecret } = await request.json();

  if (!siteUrl || !consumerKey || !consumerSecret) {
    return NextResponse.json(
      { error: 'siteUrl, consumerKey, and consumerSecret are required' },
      { status: 400 }
    );
  }

  // Normalize site URL
  const normalizedUrl = siteUrl.replace(/\/+$/, '');

  // Validate by making a test request to WooCommerce API
  try {
    const testUrl = `${normalizedUrl}/wp-json/wc/v3/products?per_page=1`;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const testResponse = await fetch(testUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('[WooCommerce Connect] Validation failed:', errorText);
      return NextResponse.json(
        { error: 'Could not connect to WooCommerce. Check your site URL and API keys.' },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error('[WooCommerce Connect] Network error:', err);
    return NextResponse.json(
      { error: 'Could not reach your site. Check the URL and make sure it is accessible.' },
      { status: 400 }
    );
  }

  // Get user's business
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Encrypt keys and save connection
  const admin = createAdminClient();
  const { error: upsertError } = await admin
    .from('store_connections')
    .upsert({
      business_id: business.id,
      platform: 'woocommerce',
      shop_domain: normalizedUrl,
      api_key_encrypted: encrypt(consumerKey),
      api_secret_encrypted: encrypt(consumerSecret),
      scopes: ['read_products', 'read_orders'],
      is_active: true,
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'business_id',
    });

  if (upsertError) {
    console.error('[WooCommerce Connect] Save error:', upsertError);
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
  }

  return NextResponse.json({ success: true, platform: 'woocommerce', shopDomain: normalizedUrl });
}
