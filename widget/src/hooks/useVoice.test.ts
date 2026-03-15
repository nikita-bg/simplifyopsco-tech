import { describe, it, expect } from 'vitest';

/**
 * Tests for pure logic extracted from useVoice.
 * WebRTC and getUserMedia require a real browser — tested in E2E (Task 23).
 */

type SiteActionType =
  | 'scrollToElement'
  | 'highlightElement'
  | 'navigateTo'
  | 'showProductCard'
  | 'showComparison'
  | 'openContactForm';

const FUNCTION_ACTION_MAP: Record<string, SiteActionType> = {
  scrollToElement: 'scrollToElement',
  highlightElement: 'highlightElement',
  navigateTo: 'navigateTo',
  showProductCard: 'showProductCard',
  showComparison: 'showComparison',
  openContactForm: 'openContactForm',
};

function parseFunctionCall(name: string, argsJson: string) {
  const actionType = FUNCTION_ACTION_MAP[name];
  if (!actionType) return null;
  try {
    const args = JSON.parse(argsJson) as Record<string, unknown>;
    return { type: actionType, ...args };
  } catch {
    return { type: actionType };
  }
}

describe('voice function call parser', () => {
  it('maps scrollToElement function call to SiteAction', () => {
    const action = parseFunctionCall('scrollToElement', '{"ref":"product-1"}');
    expect(action).toEqual({ type: 'scrollToElement', ref: 'product-1' });
  });

  it('maps highlightElement correctly', () => {
    const action = parseFunctionCall('highlightElement', '{"ref":"hero"}');
    expect(action?.type).toBe('highlightElement');
    expect(action).toHaveProperty('ref', 'hero');
  });

  it('maps navigateTo with url', () => {
    const action = parseFunctionCall('navigateTo', '{"url":"/products"}');
    expect(action?.type).toBe('navigateTo');
    expect(action).toHaveProperty('url', '/products');
  });

  it('returns null for unknown function names', () => {
    const action = parseFunctionCall('unknownFunction', '{}');
    expect(action).toBeNull();
  });

  it('handles malformed JSON args gracefully', () => {
    const action = parseFunctionCall('scrollToElement', '{invalid}');
    expect(action?.type).toBe('scrollToElement');
    expect(action).not.toHaveProperty('ref');
  });

  it('maps all 6 site control functions', () => {
    const fns = [
      'scrollToElement',
      'highlightElement',
      'navigateTo',
      'showProductCard',
      'showComparison',
      'openContactForm',
    ];
    for (const fn of fns) {
      const action = parseFunctionCall(fn, '{}');
      expect(action?.type).toBe(fn);
    }
  });
});
