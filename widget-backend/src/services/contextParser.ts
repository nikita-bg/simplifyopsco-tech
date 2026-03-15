import type { PageContext, ProductInfo, SectionInfo } from '../types/index.js';

interface RawElement {
  type: string;
  name?: string;
  price?: string;
  imageUrl?: string | null;
  selector?: string;
  tag?: string;
  isAboveFold?: boolean;
}

interface RawPageData {
  url: string;
  title: string;
  elements: RawElement[];
}

const TAG_TO_SECTION_TYPE: Record<string, SectionInfo['type']> = {
  header: 'header',
  section: 'section',
  article: 'article',
  nav: 'nav',
  footer: 'footer',
};

export function parsePageContext(raw: RawPageData): PageContext {
  const products: ProductInfo[] = [];
  const sections: SectionInfo[] = [];

  let productIndex = 0;
  let sectionIndex = 0;

  for (const el of raw.elements || []) {
    if (el.type === 'product') {
      products.push({
        name: el.name || 'Unknown Product',
        price: el.price || null,
        imageUrl: el.imageUrl || null,
        elementRef: `product-${productIndex++}`,
        position: el.isAboveFold ? 'above-fold' : 'below-fold',
      });
    } else if (el.type === 'section') {
      sections.push({
        name: el.name || 'Untitled Section',
        elementRef: `section-${sectionIndex++}`,
        type: TAG_TO_SECTION_TYPE[el.tag || 'section'] || 'section',
      });
    }
  }

  return {
    url: raw.url,
    title: raw.title || '',
    products,
    sections,
  };
}
