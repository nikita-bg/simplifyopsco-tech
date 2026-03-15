import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../src/services/promptBuilder.js';

describe('buildSystemPrompt', () => {
  it('returns base prompt when no extras provided', () => {
    const result = buildSystemPrompt('You are a sales assistant.', null, null);
    expect(result).toContain('You are a sales assistant.');
    expect(result).toContain('Site Control');
  });

  it('includes custom instructions when provided', () => {
    const result = buildSystemPrompt(
      'Base prompt.',
      'Always mention our 30-day return policy.',
      null,
    );
    expect(result).toContain('Base prompt.');
    expect(result).toContain('Always mention our 30-day return policy.');
    expect(result).toContain('Business-Specific Instructions');
  });

  it('includes page context when provided', () => {
    const result = buildSystemPrompt('Base.', null, {
      url: 'https://shop.com/laptops',
      title: 'Laptops | MyShop',
      products: [
        { name: 'MacBook Pro', price: '$3,499', imageUrl: null, elementRef: 'product-1', position: 'above-fold' },
      ],
      sections: [
        { name: 'Featured', elementRef: 'section-1', type: 'section' },
      ],
    });
    expect(result).toContain('MacBook Pro');
    expect(result).toContain('$3,499');
    expect(result).toContain('Laptops | MyShop');
    expect(result).toContain('Featured');
  });

  it('includes site control function definitions', () => {
    const result = buildSystemPrompt('Base.', null, null);
    expect(result).toContain('scrollToElement');
    expect(result).toContain('highlightElement');
    expect(result).toContain('showProductCard');
  });
});
