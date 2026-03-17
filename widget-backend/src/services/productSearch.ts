/**
 * Product Search — vector similarity search for products.
 * Used by AI when a customer asks about products.
 */
import OpenAI from 'openai';
import { supabase } from './db.js';
import { config } from '../config.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface ProductResult {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  images: string[];
  productUrl: string | null;
  similarity: number;
}

/**
 * Searches the product catalog using vector similarity.
 * Falls back to text search if no embedding results.
 */
export async function searchProducts(
  businessId: string,
  query: string,
  limit: number = 5
): Promise<ProductResult[]> {
  // Generate embedding for the search query
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      dimensions: 1536,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Vector similarity search via match_products function
    const { data: results, error } = await supabase.rpc('match_products', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.5, // Lower threshold for products (more forgiving)
      match_count: limit,
      filter_business_id: businessId,
    });

    if (!error && results && results.length > 0) {
      return results.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        price: r.price,
        images: r.images || [],
        productUrl: r.product_url,
        similarity: r.similarity,
      }));
    }
  } catch (err) {
    console.error('[ProductSearch] Embedding search failed, falling back to text:', err);
  }

  // Fallback: text search using ILIKE
  const { data: textResults } = await supabase
    .from('products')
    .select('id, title, description, price, images, product_url')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .limit(limit);

  return (textResults || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    price: r.price,
    images: r.images || [],
    productUrl: r.product_url,
    similarity: 0,
  }));
}

/**
 * Gets top products for a business (for including in system prompt context).
 */
export async function getTopProducts(
  businessId: string,
  limit: number = 20
): Promise<ProductResult[]> {
  const { data } = await supabase
    .from('products')
    .select('id, title, description, price, images, product_url')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    price: r.price,
    images: r.images || [],
    productUrl: r.product_url,
    similarity: 0,
  }));
}
