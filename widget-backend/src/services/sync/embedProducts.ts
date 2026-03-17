/**
 * Generates vector embeddings for products using OpenAI text-embedding-3-small.
 * Same model and dimensions (1536) as the knowledge_base embeddings.
 */
import OpenAI from 'openai';
import { config } from '../../config.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

/**
 * Builds a text representation of a product for embedding.
 */
function productToText(product: {
  title: string;
  description?: string | null;
  tags?: string[];
  price?: number | null;
}): string {
  const parts = [product.title];
  if (product.description) parts.push(product.description);
  if (product.tags?.length) parts.push(product.tags.join(' '));
  if (product.price) parts.push(`$${product.price}`);
  return parts.join(' ');
}

/**
 * Generates embeddings for a batch of products.
 * Returns array of { index, embedding } matching the input order.
 */
export async function generateProductEmbeddings(
  products: Array<{
    title: string;
    description?: string | null;
    tags?: string[];
    price?: number | null;
  }>
): Promise<Array<number[] | null>> {
  if (products.length === 0) return [];

  // OpenAI supports batching up to 2048 inputs
  const texts = products.map(productToText);

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    });

    // Return embeddings in order
    const result: Array<number[] | null> = new Array(products.length).fill(null);
    for (const item of response.data) {
      result[item.index] = item.embedding;
    }
    return result;
  } catch (err) {
    console.error('[EmbedProducts] Embedding generation failed:', err);
    // Return nulls — products will be saved without embeddings
    return new Array(products.length).fill(null);
  }
}
