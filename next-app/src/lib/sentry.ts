/**
 * Sentry Error Tracking Configuration
 *
 * Centralized error tracking for production monitoring
 */

// Note: Sentry SDK will be installed separately
// Run: npm install @sentry/nextjs

interface SentryConfig {
  dsn: string
  environment: string
  enabled: boolean
}

const config: SentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
}

/**
 * Initialize Sentry (called in _app.tsx or layout.tsx)
 */
export function initSentry() {
  if (!config.enabled) {
    console.log('[Sentry] Disabled in development or DSN not configured')
    return
  }

  // Sentry initialization will be here after installing @sentry/nextjs
  // Example:
  // Sentry.init({
  //   dsn: config.dsn,
  //   environment: config.environment,
  //   tracesSampleRate: 0.1,
  //   beforeSend(event) {
  //     // Filter out sensitive data
  //     return event
  //   },
  // })

  console.log(`[Sentry] Initialized in ${config.environment}`)
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!config.enabled) {
    console.error('[Error]', error, context)
    return
  }

  // Example:
  // Sentry.captureException(error, { extra: context })

  console.error('[Sentry] Captured exception:', error.message, context)
}

/**
 * Capture message for non-error events
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!config.enabled) {
    console.log(`[${level.toUpperCase()}]`, message)
    return
  }

  // Example:
  // Sentry.captureMessage(message, level)

  console.log(`[Sentry] ${level}:`, message)
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; businessId?: string }) {
  if (!config.enabled) return

  // Example:
  // Sentry.setUser({ id: user.id, email: user.email, businessId: user.businessId })

  console.log('[Sentry] User context set:', user.id)
}

/**
 * Clear user context
 */
export function clearUser() {
  if (!config.enabled) return

  // Example:
  // Sentry.setUser(null)

  console.log('[Sentry] User context cleared')
}

export default {
  init: initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
}
