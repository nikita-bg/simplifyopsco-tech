/**
 * Shopify OAuth Callback — exchanges code for access token, saves connection.
 * GET /api/integrations/shopify/callback?code=xxx&shop=xxx&state=xxx&hmac=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/encryption';
import { createHmac } from 'crypto';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;

function verifyHmac(query: URLSearchParams): boolean {
  const hmac = query.get('hmac');
  if (!hmac) return false;

  // Build message from all params except hmac
  const params = new URLSearchParams();
  query.forEach((value, key) => {
    if (key !== 'hmac') params.set(key, value);
  });
  // Sort params alphabetically
  const sorted = new URLSearchParams([...params.entries()].sort());
  const message = sorted.toString();

  const digest = createHmac('sha256', SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  return digest === hmac;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state');

  // Verify state matches cookie
  const savedState = request.cookies.get('shopify_oauth_state')?.value;
  const savedShop = request.cookies.get('shopify_oauth_shop')?.value;

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&error=invalid_state', request.url)
    );
  }

  if (!shop || shop !== savedShop) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&error=shop_mismatch', request.url)
    );
  }

  // Verify HMAC signature
  if (!verifyHmac(searchParams)) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&error=invalid_hmac', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&error=no_code', request.url)
    );
  }

  // Exchange code for permanent access token
  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[Shopify OAuth] Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&error=token_exchange', request.url)
      );
    }

    const { access_token, scope } = await tokenResponse.json();

    // Get user's business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&error=no_business', request.url)
      );
    }

    // Encrypt token and save connection
    const admin = createAdminClient();
    const { error: upsertError } = await admin
      .from('store_connections')
      .upsert({
        business_id: business.id,
        platform: 'shopify',
        shop_domain: shop,
        access_token_encrypted: encrypt(access_token),
        scopes: scope.split(','),
        is_active: true,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id',
      });

    if (upsertError) {
      console.error('[Shopify OAuth] Save connection error:', upsertError);
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&error=save_failed', request.url)
      );
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&connected=shopify', request.url)
    );
    response.cookies.delete('shopify_oauth_state');
    response.cookies.delete('shopify_oauth_shop');
    return response;

  } catch (err) {
    console.error('[Shopify OAuth] Error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&error=unknown', request.url)
    );
  }
}
