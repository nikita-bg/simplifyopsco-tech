/**
 * Bridge Script — executes site control commands on the customer's DOM.
 * Runs in the parent page (injected by embed.js).
 * Receives postMessage commands from the widget iframe and sends results back.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductContext {
  elementRef: string;
  name: string;
  price: string;
  image?: string;
  position: 'above-fold' | 'below-fold';
}

export interface SectionContext {
  name: string;
  elementRef: string;
}

export interface PageContext {
  url: string;
  title: string;
  products: ProductContext[];
  sections: SectionContext[];
}

export interface ProductCardData {
  name?: string;
  price?: string;
  image?: string;
  ctaUrl?: string;
  ctaText?: string;
}

export interface BridgeCommand {
  type:
    | 'getPageContext'
    | 'scrollToElement'
    | 'highlightElement'
    | 'navigateTo'
    | 'showProductCard'
    | 'showComparison'
    | 'openContactForm';
  ref?: string;
  url?: string;
  data?: ProductCardData;
  products?: Array<{ name: string; price: string; image?: string }>;
}

// ─── Element lookup ──────────────────────────────────────────────────────────

/**
 * Finds an element by ref (data-product-id, data-section, id, or text match).
 */
function findElement(ref: string): Element | null {
  // 1. data-product-id attribute
  let el = document.querySelector(`[data-product-id="${ref}"]`);
  if (el) return el;

  // 2. data-section attribute
  el = document.querySelector(`[data-section="${ref}"]`);
  if (el) return el;

  // 3. id attribute
  el = document.getElementById(ref);
  if (el) return el;

  // 4. text content match (headings and product titles)
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,[class*="title"],[class*="name"]'));
  const match = headings.find(h => h.textContent?.toLowerCase().includes(ref.toLowerCase()));
  return match || null;
}

function isAboveFold(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight;
}

// ─── getPageContext ──────────────────────────────────────────────────────────

export function getPageContext(): PageContext {
  const products: ProductContext[] = [];
  const sections: SectionContext[] = [];

  // Products via data-product-id
  document.querySelectorAll('[data-product-id]').forEach(el => {
    const ref = (el as HTMLElement).dataset.productId!;
    const titleEl = el.querySelector('[class*="title"],[class*="name"],h1,h2,h3,img[alt]');
    const priceEl = el.querySelector('[class*="price"],[class*="cost"],[class*="amount"]');
    const imgEl = el.querySelector('img');

    const name =
      (titleEl instanceof HTMLImageElement ? titleEl.alt : titleEl?.textContent?.trim()) ??
      el.textContent?.trim().slice(0, 60) ??
      ref;
    const price = priceEl?.textContent?.trim() ?? '';
    const image = imgEl?.src ?? '';

    products.push({
      elementRef: ref,
      name,
      price,
      image,
      position: isAboveFold(el) ? 'above-fold' : 'below-fold',
    });
  });

  // Sections via data-section
  document.querySelectorAll('[data-section]').forEach(el => {
    const ref = (el as HTMLElement).dataset.section!;
    const heading = el.querySelector('h1,h2,h3');
    sections.push({
      name: heading?.textContent?.trim() ?? ref,
      elementRef: ref,
    });
  });

  // Sections via semantic <section> and <article> if no data-section found
  if (sections.length === 0) {
    document.querySelectorAll('section[id],article[id]').forEach(el => {
      const id = (el as HTMLElement).id;
      const heading = el.querySelector('h1,h2,h3');
      sections.push({
        name: heading?.textContent?.trim() ?? id,
        elementRef: id,
      });
    });
  }

  return {
    url: window.location.href,
    title: document.title,
    products,
    sections,
  };
}

// ─── scrollToElement ─────────────────────────────────────────────────────────

export function scrollToElement(ref: string): void {
  const el = findElement(ref);
  if (!el) {
    console.warn(`[SimplifyOps] scrollToElement: element "${ref}" not found`);
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── highlightElement ────────────────────────────────────────────────────────

export function highlightElement(ref: string): void {
  const el = findElement(ref) as HTMLElement | null;
  if (!el) {
    console.warn(`[SimplifyOps] highlightElement: element "${ref}" not found`);
    return;
  }

  const rect = el.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = 'so-highlight-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: '3px solid #6366f1',
    borderRadius: '8px',
    boxShadow: '0 0 0 4px rgba(99,102,241,0.3)',
    pointerEvents: 'none',
    zIndex: '2147483647',
    transition: 'opacity 0.3s ease',
  });
  document.body.appendChild(overlay);

  // Remove after 3 seconds
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }, 3000);
}

// ─── navigateTo ─────────────────────────────────────────────────────────────

export function navigateTo(url: string): void {
  try {
    // Allow relative paths (no origin check needed)
    if (url.startsWith('/') || url.startsWith('#')) {
      window.location.href = url;
      return;
    }

    const parsed = new URL(url, window.location.href);
    if (parsed.origin !== window.location.origin) {
      console.warn(`[SimplifyOps] navigateTo blocked cross-origin URL: ${url}`);
      return;
    }
    window.location.href = parsed.href;
  } catch {
    console.warn(`[SimplifyOps] navigateTo: invalid URL "${url}"`);
  }
}

// ─── showProductCard ─────────────────────────────────────────────────────────

export function showProductCard(data: ProductCardData): void {
  // Remove existing card if any
  document.querySelector('.so-product-card-overlay')?.remove();

  const hasRequiredFields = data && data.name;

  const card = document.createElement('div');
  card.className = 'so-product-card-overlay';
  Object.assign(card.style, {
    position: 'fixed',
    bottom: '100px',
    right: '24px',
    width: '280px',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    zIndex: '2147483646',
    padding: '16px',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  });

  if (!hasRequiredFields) {
    card.innerHTML = `
      <button class="so-close-btn" style="align-self:flex-end;background:none;border:none;cursor:pointer;font-size:18px;">✕</button>
      <p style="color:#888;text-align:center">Product unavailable</p>
    `;
  } else {
    const imgHtml = data.image
      ? `<img src="${data.image}" alt="${data.name}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;" />`
      : '';
    const ctaHtml = data.ctaUrl
      ? `<a href="${data.ctaUrl}" style="display:block;background:#6366f1;color:#fff;text-align:center;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;">${data.ctaText ?? 'View product'}</a>`
      : '';

    card.innerHTML = `
      <button class="so-close-btn" style="align-self:flex-end;background:none;border:none;cursor:pointer;font-size:18px;">✕</button>
      ${imgHtml}
      <div style="font-weight:600;font-size:15px;">${data.name}</div>
      ${data.price ? `<div style="color:#6366f1;font-size:16px;font-weight:700;">${data.price}</div>` : ''}
      ${ctaHtml}
    `;
  }

  card.querySelector('.so-close-btn')!.addEventListener('click', () => card.remove());
  document.body.appendChild(card);
}

// ─── showComparison ──────────────────────────────────────────────────────────

export function showComparison(products: Array<{ name: string; price: string; image?: string }>): void {
  document.querySelector('.so-comparison-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'so-comparison-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
    zIndex: '2147483646',
    padding: '24px',
    fontFamily: 'system-ui, sans-serif',
    maxWidth: '600px',
    width: '90vw',
  });

  const cols = products
    .map(
      p => `
      <div style="flex:1;padding:12px;text-align:center;">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;" />` : ''}
        <div style="font-weight:600;margin-top:8px;">${p.name}</div>
        <div style="color:#6366f1;font-weight:700;margin-top:4px;">${p.price}</div>
      </div>`,
    )
    .join('<div style="width:1px;background:#eee;margin:0 8px;"></div>');

  overlay.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <span style="font-weight:700;font-size:16px;">Compare Products</span>
      <button class="so-close-btn" style="background:none;border:none;cursor:pointer;font-size:20px;">✕</button>
    </div>
    <div style="display:flex;gap:8px;">${cols}</div>
  `;

  overlay.querySelector('.so-close-btn')!.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ─── openContactForm ──────────────────────────────────────────────────────────

export function openContactForm(): void {
  const form =
    document.querySelector('form[id*="contact"], form[class*="contact"], #contact, #contact-form, form') as HTMLElement | null;

  if (!form) {
    console.warn('[SimplifyOps] openContactForm: no contact form found on page');
    return;
  }

  form.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Optional: briefly highlight the form
  const prev = form.style.outline;
  form.style.outline = '3px solid #6366f1';
  setTimeout(() => { form.style.outline = prev; }, 2500);
}

// ─── handleBridgeMessage ─────────────────────────────────────────────────────

/**
 * Routes a parsed bridge command to the appropriate function.
 * Called by the postMessage listener (and directly in tests).
 */
export function handleBridgeMessage(cmd: BridgeCommand): PageContext | void {
  switch (cmd.type) {
    case 'getPageContext':
      return getPageContext();
    case 'scrollToElement':
      if (cmd.ref) scrollToElement(cmd.ref);
      break;
    case 'highlightElement':
      if (cmd.ref) highlightElement(cmd.ref);
      break;
    case 'navigateTo':
      if (cmd.url) navigateTo(cmd.url);
      break;
    case 'showProductCard':
      showProductCard(cmd.data ?? {});
      break;
    case 'showComparison':
      showComparison(cmd.products ?? []);
      break;
    case 'openContactForm':
      openContactForm();
      break;
    default:
      console.warn(`[SimplifyOps] Unknown bridge command: ${(cmd as BridgeCommand).type}`);
  }
}

// ─── postMessage listener ────────────────────────────────────────────────────

/**
 * Bootstraps the postMessage listener when running in a real browser.
 * Not called during tests — tests import and call functions directly.
 */
export function initBridge(widgetOrigin: string): void {
  window.addEventListener('message', (event: MessageEvent) => {
    // Only accept messages from the widget iframe origin
    if (event.origin !== widgetOrigin) return;

    const cmd = event.data as BridgeCommand & { __soMsgId?: string };
    if (!cmd?.type) return;

    const result = handleBridgeMessage(cmd);

    // Send result back to iframe (for getPageContext)
    if (result !== undefined && event.source) {
      (event.source as Window).postMessage(
        { __soResponse: true, __soMsgId: cmd.__soMsgId, result },
        { targetOrigin: event.origin },
      );
    }
  });
}
