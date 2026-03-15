import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPageContext,
  scrollToElement,
  highlightElement,
  navigateTo,
  showProductCard,
  showComparison,
  openContactForm,
  handleBridgeMessage,
} from '../src/bridge';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildProductDOM() {
  document.body.innerHTML = `
    <div data-product-id="p1" class="product-card">
      <img src="macbook.jpg" alt="MacBook Pro" />
      <h2 class="product-title">MacBook Pro M3</h2>
      <span class="price">$3,499</span>
      <button>Add to cart</button>
    </div>
    <div data-product-id="p2" class="product-card">
      <img src="ipad.jpg" alt="iPad Pro" />
      <h2 class="product-title">iPad Pro M4</h2>
      <span class="price">$1,099</span>
    </div>
    <section data-section="about">
      <h2>About us</h2>
      <p>We sell Apple products.</p>
    </section>
    <form id="contact-form">
      <input type="email" />
      <button type="submit">Send</button>
    </form>
  `;
}

// ─── getPageContext ──────────────────────────────────────────────────────────

describe('getPageContext()', () => {
  beforeEach(buildProductDOM);
  afterEach(() => { document.body.innerHTML = ''; });

  it('extracts products from data-product-id elements', () => {
    const ctx = getPageContext();
    expect(ctx.products).toHaveLength(2);
    expect(ctx.products[0].elementRef).toBe('p1');
    expect(ctx.products[0].name).toContain('MacBook');
    expect(ctx.products[0].price).toContain('3,499');
  });

  it('extracts sections from data-section elements', () => {
    const ctx = getPageContext();
    expect(ctx.sections.some(s => s.name === 'about' || s.name === 'About us')).toBe(true);
  });

  it('includes page url and title', () => {
    const ctx = getPageContext();
    expect(typeof ctx.url).toBe('string');
    expect(typeof ctx.title).toBe('string');
  });

  it('returns empty arrays for missing elements', () => {
    document.body.innerHTML = '<p>No products here</p>';
    const ctx = getPageContext();
    expect(ctx.products).toHaveLength(0);
  });
});

// ─── scrollToElement ─────────────────────────────────────────────────────────

describe('scrollToElement()', () => {
  beforeEach(buildProductDOM);
  afterEach(() => { document.body.innerHTML = ''; });

  it('calls scrollIntoView on the target element', () => {
    const el = document.querySelector('[data-product-id="p1"]') as HTMLElement;
    el.scrollIntoView = vi.fn();
    scrollToElement('p1');
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('does not throw when element not found', () => {
    expect(() => scrollToElement('nonexistent')).not.toThrow();
  });
});

// ─── highlightElement ────────────────────────────────────────────────────────

describe('highlightElement()', () => {
  beforeEach(buildProductDOM);
  afterEach(() => {
    document.body.innerHTML = '';
    document.querySelectorAll('.so-highlight-overlay').forEach(el => el.remove());
  });

  it('adds a highlight overlay near the target element', () => {
    highlightElement('p1');
    // overlay or outline style should be applied
    const overlay = document.querySelector('.so-highlight-overlay');
    const el = document.querySelector('[data-product-id="p1"]') as HTMLElement;
    expect(overlay !== null || el.style.outline !== '').toBe(true);
  });

  it('does not throw when element not found', () => {
    expect(() => highlightElement('nonexistent')).not.toThrow();
  });

  it('removes highlight after timeout', async () => {
    vi.useFakeTimers();
    highlightElement('p1');
    vi.advanceTimersByTime(3400);
    const overlay = document.querySelector('.so-highlight-overlay');
    expect(overlay).toBeNull();
    vi.useRealTimers();
  });
});

// ─── navigateTo ─────────────────────────────────────────────────────────────

describe('navigateTo()', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // jsdom location is not writable normally; use defineProperty
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/', origin: 'http://localhost' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('navigates to same-origin relative URL', () => {
    navigateTo('/products');
    expect(window.location.href).toBe('/products');
  });

  it('navigates to same-origin absolute URL', () => {
    navigateTo('http://localhost/about');
    expect(window.location.href).toBe('http://localhost/about');
  });

  it('blocks cross-origin navigation', () => {
    navigateTo('https://evil.com/steal');
    expect(window.location.href).not.toBe('https://evil.com/steal');
  });

  it('does not throw on invalid URL', () => {
    expect(() => navigateTo('not-a-url-with-evil://')).not.toThrow();
  });
});

// ─── showProductCard ─────────────────────────────────────────────────────────

describe('showProductCard()', () => {
  afterEach(() => {
    document.querySelectorAll('.so-product-card-overlay').forEach(el => el.remove());
  });

  it('creates a product card overlay in the DOM', () => {
    showProductCard({ name: 'MacBook Pro', price: '$3,499', image: 'mac.jpg', ctaUrl: '/buy', ctaText: 'Buy now' });
    const card = document.querySelector('.so-product-card-overlay');
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain('MacBook Pro');
    expect(card!.textContent).toContain('$3,499');
  });

  it('shows fallback card on missing required fields', () => {
    showProductCard({} as any);
    const card = document.querySelector('.so-product-card-overlay');
    expect(card).not.toBeNull();
    expect(card!.textContent?.toLowerCase()).toContain('unavailable');
  });

  it('close button removes the overlay', () => {
    showProductCard({ name: 'iPad', price: '$999' });
    const btn = document.querySelector('.so-product-card-overlay .so-close-btn') as HTMLElement;
    btn?.click();
    expect(document.querySelector('.so-product-card-overlay')).toBeNull();
  });
});

// ─── showComparison ──────────────────────────────────────────────────────────

describe('showComparison()', () => {
  afterEach(() => {
    document.querySelectorAll('.so-comparison-overlay').forEach(el => el.remove());
  });

  it('renders a comparison overlay with two products', () => {
    showComparison([
      { name: 'MacBook Air', price: '$1,099' },
      { name: 'MacBook Pro', price: '$1,999' },
    ]);
    const overlay = document.querySelector('.so-comparison-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.textContent).toContain('MacBook Air');
    expect(overlay!.textContent).toContain('MacBook Pro');
  });

  it('closes on click of close button', () => {
    showComparison([{ name: 'A', price: '$1' }, { name: 'B', price: '$2' }]);
    const btn = document.querySelector('.so-comparison-overlay .so-close-btn') as HTMLElement;
    btn?.click();
    expect(document.querySelector('.so-comparison-overlay')).toBeNull();
  });
});

// ─── openContactForm ──────────────────────────────────────────────────────────

describe('openContactForm()', () => {
  beforeEach(buildProductDOM);
  afterEach(() => { document.body.innerHTML = ''; });

  it('scrolls to contact form when it exists', () => {
    const form = document.getElementById('contact-form') as HTMLElement;
    form.scrollIntoView = vi.fn();
    openContactForm();
    expect(form.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('does not throw when no form exists', () => {
    document.body.innerHTML = '<p>No form here</p>';
    expect(() => openContactForm()).not.toThrow();
  });
});

// ─── handleBridgeMessage ─────────────────────────────────────────────────────

describe('handleBridgeMessage()', () => {
  beforeEach(buildProductDOM);
  afterEach(() => {
    document.body.innerHTML = '';
    document.querySelectorAll('.so-product-card-overlay, .so-comparison-overlay, .so-highlight-overlay').forEach(el => el.remove());
  });

  it('routes scrollToElement command', () => {
    const el = document.querySelector('[data-product-id="p1"]') as HTMLElement;
    el.scrollIntoView = vi.fn();
    handleBridgeMessage({ type: 'scrollToElement', ref: 'p1' });
    expect(el.scrollIntoView).toHaveBeenCalled();
  });

  it('routes highlightElement command', () => {
    expect(() => handleBridgeMessage({ type: 'highlightElement', ref: 'p1' })).not.toThrow();
  });

  it('routes getPageContext command and returns data', () => {
    const result = handleBridgeMessage({ type: 'getPageContext' });
    expect(result).toHaveProperty('products');
    expect(result).toHaveProperty('url');
  });

  it('routes showProductCard command', () => {
    handleBridgeMessage({ type: 'showProductCard', data: { name: 'Test', price: '$1' } });
    expect(document.querySelector('.so-product-card-overlay')).not.toBeNull();
  });

  it('ignores unknown command types silently', () => {
    expect(() => handleBridgeMessage({ type: 'unknownCommand' as any })).not.toThrow();
  });
});
