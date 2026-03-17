/**
 * Products API
 * GET: List products for current business
 * POST: Create manual product (with embedding generation)
 * DELETE: Delete a product
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  let query = supabase
    .from('products')
    .select('id, title, description, price, compare_at_price, currency, images, variants, inventory_status, product_url, tags, is_active, synced_at, platform_product_id, created_at, updated_at')
    .eq('business_id', business.id)
    .order('updated_at', { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data: products, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }

  return NextResponse.json({ products: products || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const body = await request.json();
  const { title, description, price, images, productUrl, tags } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Generate embedding
  let embedding: number[] | null = null;
  try {
    const text = [title, description, tags?.join(' ')].filter(Boolean).join(' ');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    });
    embedding = embeddingResponse.data[0].embedding;
  } catch (err) {
    console.error('[Products] Embedding generation failed:', err);
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      business_id: business.id,
      title,
      description: description || null,
      price: price ? parseFloat(price) : null,
      images: images || [],
      product_url: productUrl || null,
      tags: tags || [],
      is_active: true,
      embedding: embedding ? JSON.stringify(embedding) : null,
    })
    .select('id, title, price, images, is_active, created_at')
    .single();

  if (error) {
    console.error('[Products] Create error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }

  return NextResponse.json({ product, embedded: !!embedding });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
