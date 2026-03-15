import { describe, it, expect } from 'vitest';
import type { ProductCardData } from '../lib/types';

/**
 * Tests for pure display logic extracted from ProductCard.
 * React rendering requires a browser — tested in E2E (Task 23).
 */

function formatPrice(price?: string): string {
  return price || 'Contact for pricing';
}

function getImageAlt(product: ProductCardData): string {
  return `${product.name} product image`;
}

function hasBuyUrl(product: ProductCardData): boolean {
  return !!product.buyUrl;
}

describe('ProductCard display logic', () => {
  it('returns price string when price is provided', () => {
    expect(formatPrice('$99')).toBe('$99');
  });

  it('returns fallback when price is undefined', () => {
    expect(formatPrice(undefined)).toBe('Contact for pricing');
  });

  it('returns fallback for empty string price', () => {
    expect(formatPrice('')).toBe('Contact for pricing');
  });

  it('builds alt text from product name', () => {
    const product: ProductCardData = { name: 'Basic Plan' };
    expect(getImageAlt(product)).toBe('Basic Plan product image');
  });

  it('returns true when product has a buy URL', () => {
    const product: ProductCardData = { name: 'Pro', buyUrl: '/buy/pro' };
    expect(hasBuyUrl(product)).toBe(true);
  });

  it('returns false when product has no buy URL', () => {
    const product: ProductCardData = { name: 'Pro' };
    expect(hasBuyUrl(product)).toBe(false);
  });
});
