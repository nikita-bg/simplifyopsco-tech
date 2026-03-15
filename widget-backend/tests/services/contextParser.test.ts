import { describe, it, expect } from 'vitest';
import { parsePageContext } from '../../src/services/contextParser.js';

describe('parsePageContext', () => {
  it('extracts products from raw DOM data', () => {
    const result = parsePageContext({
      url: 'https://shop.com/laptops',
      title: 'Laptops | Shop',
      elements: [
        {
          type: 'product',
          name: 'MacBook Pro M3',
          price: '$3,499',
          imageUrl: 'https://shop.com/mac.jpg',
          selector: '#product-1',
          isAboveFold: true,
        },
        {
          type: 'product',
          name: 'ThinkPad X1',
          price: '$1,299',
          imageUrl: null,
          selector: '#product-2',
          isAboveFold: false,
        },
      ],
    });

    expect(result.url).toBe('https://shop.com/laptops');
    expect(result.title).toBe('Laptops | Shop');
    expect(result.products).toHaveLength(2);
    expect(result.products[0].name).toBe('MacBook Pro M3');
    expect(result.products[0].price).toBe('$3,499');
    expect(result.products[0].elementRef).toBe('product-0');
    expect(result.products[0].position).toBe('above-fold');
    expect(result.products[1].position).toBe('below-fold');
  });

  it('extracts sections from raw DOM data', () => {
    const result = parsePageContext({
      url: 'https://shop.com',
      title: 'Home',
      elements: [
        { type: 'section', name: 'Featured Products', tag: 'section', selector: '.featured' },
        { type: 'section', name: 'About Us', tag: 'article', selector: '#about' },
      ],
    });

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].name).toBe('Featured Products');
    expect(result.sections[0].type).toBe('section');
    expect(result.sections[0].elementRef).toBe('section-0');
  });

  it('handles empty elements', () => {
    const result = parsePageContext({
      url: 'https://shop.com',
      title: 'Empty Page',
      elements: [],
    });

    expect(result.products).toHaveLength(0);
    expect(result.sections).toHaveLength(0);
  });

  it('handles missing fields gracefully', () => {
    const result = parsePageContext({
      url: 'https://shop.com',
      title: '',
      elements: [
        { type: 'product', name: 'Widget' },
      ],
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0].price).toBeNull();
    expect(result.products[0].imageUrl).toBeNull();
  });
});
