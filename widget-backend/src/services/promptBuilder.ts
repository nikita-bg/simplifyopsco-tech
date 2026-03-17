import type { PageContext } from '../types/index.js';
import type { ProductResult } from './productSearch.js';

const SITE_CONTROL_INSTRUCTIONS = `
You can control the customer's website using these actions. Include them in your response when relevant:
- scrollToElement(ref): Smooth scroll to a product or section
- highlightElement(ref): Visually highlight an element
- navigateTo(url): Navigate to another page (same site only)
- showProductCard(data): Show a product popup with image, price, buy button
- openContactForm(): Open the contact form
- showComparison(products): Show side-by-side product comparison
- searchProducts(query): Search the product catalog for matching products
- lookupOrder(email, orderNumber): Look up a customer's order status

When referencing elements, use the "elementRef" values from the page context.
Always combine helpful text with relevant site control actions.
For product questions, use searchProducts to find relevant products, then display them with showProductCard or showComparison.
For order status questions, ask the customer for their email address or order number, then use lookupOrder.
`;

export function buildSystemPrompt(
  basePrompt: string,
  customInstructions: string | null,
  pageContext: PageContext | null,
  productCatalog?: ProductResult[],
  hasOrderLookup?: boolean,
): string {
  let prompt = basePrompt;

  if (customInstructions) {
    prompt += '\n\n## Business-Specific Instructions\n' + customInstructions;
  }

  prompt += '\n\n## Site Control\n' + SITE_CONTROL_INSTRUCTIONS;

  if (productCatalog && productCatalog.length > 0) {
    prompt += '\n\n## Product Catalog\n';
    prompt += `This business has ${productCatalog.length} products available. Here are some:\n`;
    const summary = productCatalog.slice(0, 10).map(p =>
      `- ${p.title}${p.price ? ` ($${p.price})` : ''}`
    ).join('\n');
    prompt += summary;
    prompt += '\n\nUse searchProducts(query) to find specific products when customers ask.';
  }

  if (hasOrderLookup) {
    prompt += '\n\n## Order Tracking\n';
    prompt += 'This business has order tracking enabled. When a customer asks about their order:\n';
    prompt += '1. Ask for their email address or order number\n';
    prompt += '2. Use lookupOrder(email, orderNumber) to find their order\n';
    prompt += '3. Share the order status, tracking info, and estimated delivery\n';
  }

  if (pageContext) {
    prompt += '\n\n## Current Page Context\n';
    prompt += `Page: ${pageContext.title} (${pageContext.url})\n`;
    if (pageContext.products.length > 0) {
      prompt += '\nProducts on this page:\n';
      prompt += JSON.stringify(pageContext.products, null, 2);
    }
    if (pageContext.sections.length > 0) {
      prompt += '\nSections on this page:\n';
      prompt += JSON.stringify(pageContext.sections, null, 2);
    }
  }

  return prompt;
}
