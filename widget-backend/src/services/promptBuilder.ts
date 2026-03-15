import type { PageContext } from '../types/index.js';

const SITE_CONTROL_INSTRUCTIONS = `
You can control the customer's website using these actions. Include them in your response when relevant:
- scrollToElement(ref): Smooth scroll to a product or section
- highlightElement(ref): Visually highlight an element
- navigateTo(url): Navigate to another page (same site only)
- showProductCard(data): Show a product popup with image, price, buy button
- openContactForm(): Open the contact form
- showComparison(products): Show side-by-side product comparison

When referencing elements, use the "elementRef" values from the page context.
Always combine helpful text with relevant site control actions.
`;

export function buildSystemPrompt(
  basePrompt: string,
  customInstructions: string | null,
  pageContext: PageContext | null,
): string {
  let prompt = basePrompt;

  if (customInstructions) {
    prompt += '\n\n## Business-Specific Instructions\n' + customInstructions;
  }

  prompt += '\n\n## Site Control\n' + SITE_CONTROL_INSTRUCTIONS;

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
