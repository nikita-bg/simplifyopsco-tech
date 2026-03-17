/**
 * Shopify OAuth Install — redirects merchant to Shopify authorization screen.
 * GET /api/integrations/shopify/install?shop=mystore.myshopify.com
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SCOPES = 'read_products,read_orders';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shop = request.nextUrl.searchParams.get('shop');
  if (!shop || !shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
    return NextResponse.json(
      { error: 'Invalid shop domain. Use format: mystore.myshopify.com' },
      { status: 400 }
    );
  }

  // Generate state nonce for CSRF protection
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/shopify/callback`;

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', SHOPIFY_API_KEY);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  // Store state in cookie for verification in callback
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  response.cookies.set('shopify_oauth_shop', shop, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
