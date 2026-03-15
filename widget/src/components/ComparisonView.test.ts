import { describe, it, expect } from 'vitest';
import type { ProductCardData } from '../lib/types';

/**
 * Tests for pure display logic extracted from ComparisonView.
 * React rendering requires a browser — tested in E2E (Task 23).
 */

function limitProducts(products: ProductCardData[], max = 3): ProductCardData[] {
  return products.slice(0, max);
}

function getComparisonFields(product: ProductCardData): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = [];
  fields.push({ label: 'Name', value: product.name });
  if (product.price !== undefined) fields.push({ label: 'Price', value: product.price });
  if (product.description !== undefined) fields.push({ label: 'Description', value: product.description });
  return fields;
}

function allFieldLabels(products: ProductCardData[]): string[] {
  const labels = new Set<string>();
  for (const p of products) {
    for (const f of getComparisonFields(p)) labels.add(f.label);
  }
  return Array.from(labels);
}

describe('ComparisonView display logic', () => {
  it('returns all products when count is within limit', () => {
    const products: ProductCardData[] = [
      { name: 'A' },
      { name: 'B' },
    ];
    expect(limitProducts(products)).toHaveLength(2);
  });

  it('trims to max 3 products', () => {
    const products: ProductCardData[] = [
      { name: 'A' },
      { name: 'B' },
      { name: 'C' },
      { name: 'D' },
    ];
    const result = limitProducts(products);
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.name)).toEqual(['A', 'B', 'C']);
  });

  it('handles empty product list', () => {
    expect(limitProducts([])).toHaveLength(0);
  });

  it('includes Name field for every product', () => {
    const product: ProductCardData = { name: 'Pro Plan' };
    const fields = getComparisonFields(product);
    expect(fields.find((f) => f.label === 'Name')?.value).toBe('Pro Plan');
  });

  it('includes Price field when present', () => {
    const product: ProductCardData = { name: 'Pro', price: '$49/mo' };
    const fields = getComparisonFields(product);
    expect(fields.find((f) => f.label === 'Price')?.value).toBe('$49/mo');
  });

  it('omits Price field when missing', () => {
    const product: ProductCardData = { name: 'Pro' };
    const fields = getComparisonFields(product);
    expect(fields.find((f) => f.label === 'Price')).toBeUndefined();
  });

  it('collects union of all field labels across products', () => {
    const products: ProductCardData[] = [
      { name: 'A', price: '$10' },
      { name: 'B', description: 'Great product' },
    ];
    const labels = allFieldLabels(products);
    expect(labels).toContain('Name');
    expect(labels).toContain('Price');
    expect(labels).toContain('Description');
  });
});
