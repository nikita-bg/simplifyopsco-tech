/**
 * SimplifyOps Voice Widget Loader
 * Version: 2.0.0
 *
 * This script is embedded by customers on their websites.
 * It loads the voice widget in an isolated iframe.
 *
 * Usage:
 * <script>
 *   window.SimplifyOpsConfig = {
 *     apiKey: 'so_live_abc123...',
 *     position: 'bottom-right' // optional
 *   };
 * </script>
 * <script src="https://cdn.simplifyops.tech/widget.js" async></script>
 */

(function () {
  'use strict';

  // Check if already loaded
  if (window.SimplifyOpsWidget) {
    console.warn('[SimplifyOps] Widget already loaded');
    return;
  }

  // Get config from global scope
  const config = window.SimplifyOpsConfig || {};

  // Validate API key
  if (!config.apiKey) {
    console.error('[SimplifyOps] Missing API key. Set window.SimplifyOpsConfig.apiKey');
    return;
  }

  // Validate API key format
  if (!config.apiKey.startsWith('so_live_') && !config.apiKey.startsWith('so_test_')) {
    console.error('[SimplifyOps] Invalid API key format');
    return;
  }

  // Configuration
  const API_BASE = config.apiBase || 'https://simplifyops.tech';
  const POSITION = config.position || 'bottom-right';
  const WIDGET_ID = 'simplifyops-widget-iframe';

  // Widget state
  let iframe = null;
  let isOpen = false;
  let isMinimized = true;
  let widgetConfig = null;

  /**
   * Fetch widget configuration from API
   */
  async function fetchConfig() {
    try {
      const response = await fetch(
        `${API_BASE}/api/widget/config?api_key=${config.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[SimplifyOps] Config fetch failed:', error);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[SimplifyOps] Config fetch error:', error);
      return null;
    }
  }

  /**
   * Create and inject iframe
   */
  function createIframe() {
    // Create iframe
    iframe = document.createElement('iframe');
    iframe.id = WIDGET_ID;
    iframe.src = `${API_BASE}/widget/embed?api_key=${config.apiKey}`;
    iframe.style.cssText = getIframeStyles(POSITION, isMinimized);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('allow', 'microphone');

    // Append to body
    document.body.appendChild(iframe);

    // Listen for messages from iframe
    window.addEventListener('message', handleMessage);
  }

  /**
   * Get iframe CSS styles based on position and state
   */
  function getIframeStyles(position, minimized) {
    const base = `
      position: fixed;
      z-index: 999999;
      border: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      border-radius: 16px;
    `;

    const positionStyles = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
    };

    const sizeStyles = minimized
      ? 'width: 80px; height: 80px;' // Minimized: floating button
      : 'width: 400px; height: 600px;'; // Expanded: full widget

    return base + (positionStyles[position] || positionStyles['bottom-right']) + sizeStyles;
  }

  /**
   * Handle messages from iframe
   */
  function handleMessage(event) {
    // Security: Verify origin
    if (!event.origin.includes(new URL(API_BASE).hostname)) {
      return;
    }

    const { type, data } = event.data;

    switch (type) {
      case 'widget:ready':
        console.log('[SimplifyOps] Widget ready');
        break;

      case 'widget:toggle':
        toggleWidget();
        break;

      case 'widget:minimize':
        minimizeWidget();
        break;

      case 'widget:expand':
        expandWidget();
        break;

      case 'widget:close':
        closeWidget();
        break;

      case 'widget:error':
        console.error('[SimplifyOps] Widget error:', data);
        break;

      default:
        console.log('[SimplifyOps] Unknown message type:', type);
    }
  }

  /**
   * Toggle widget open/closed
   */
  function toggleWidget() {
    if (isMinimized) {
      expandWidget();
    } else {
      minimizeWidget();
    }
  }

  /**
   * Expand widget to full size
   */
  function expandWidget() {
    if (!iframe) return;

    isMinimized = false;
    iframe.style.cssText = getIframeStyles(POSITION, false);

    // Notify iframe
    iframe.contentWindow?.postMessage({ type: 'widget:expanded' }, API_BASE);
  }

  /**
   * Minimize widget to button
   */
  function minimizeWidget() {
    if (!iframe) return;

    isMinimized = true;
    iframe.style.cssText = getIframeStyles(POSITION, true);

    // Notify iframe
    iframe.contentWindow?.postMessage({ type: 'widget:minimized' }, API_BASE);
  }

  /**
   * Close widget (remove from DOM)
   */
  function closeWidget() {
    if (iframe) {
      iframe.remove();
      iframe = null;
    }
    window.removeEventListener('message', handleMessage);
  }

  /**
   * Initialize widget
   */
  async function init() {
    console.log('[SimplifyOps] Initializing widget...');

    // Fetch configuration
    widgetConfig = await fetchConfig();

    if (!widgetConfig) {
      console.error('[SimplifyOps] Failed to load widget configuration');
      return;
    }

    // Create iframe
    createIframe();

    console.log('[SimplifyOps] Widget loaded successfully');
  }

  // Public API
  window.SimplifyOpsWidget = {
    toggle: toggleWidget,
    expand: expandWidget,
    minimize: minimizeWidget,
    close: closeWidget,
    config: widgetConfig,
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
