import { useCallback } from 'react';
import type { SiteAction } from '../lib/types';

/**
 * Sends postMessage commands to the bridge script in the parent window.
 * The bridge translates these into DOM operations (scroll, highlight, etc.).
 */
export function useBridge() {
  const executeActions = useCallback((actions: SiteAction[]) => {
    for (const action of actions) {
      const { type, ...rest } = action;
      window.parent.postMessage({ type: `so:${type}`, ...rest }, '*');
    }
  }, []);

  return { executeActions };
}
