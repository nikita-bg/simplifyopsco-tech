/**
 * PII (Personally Identifiable Information) Redaction Utilities
 *
 * Redacts sensitive data from conversation transcripts before storage.
 * GDPR, CCPA, and PCI DSS compliance requirement.
 *
 * Redacted patterns:
 * - Social Security Numbers (SSN)
 * - Credit card numbers
 * - Email addresses
 * - Phone numbers
 * - IP addresses (optional)
 *
 * NOTE: This is regex-based redaction. For more sophisticated detection
 * (international formats, context-aware), consider Google DLP API.
 */

export interface RedactionConfig {
  ssn?: boolean;
  creditCard?: boolean;
  email?: boolean;
  phone?: boolean;
  ipAddress?: boolean;
  customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
}

export const DEFAULT_REDACTION_CONFIG: Required<Omit<RedactionConfig, 'customPatterns'>> = {
  ssn: true,
  creditCard: true,
  email: true,
  phone: true,
  ipAddress: false, // Disabled by default, can be useful for analytics
};

// PII Patterns
const PII_PATTERNS = {
  // Social Security Numbers (US format: XXX-XX-XXXX or XXXXXXXXX)
  ssn: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,

  // Credit Card Numbers (various formats with optional spaces/dashes)
  // Matches: 4111-1111-1111-1111, 4111 1111 1111 1111, 4111111111111111
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // Email addresses (RFC 5322 simplified)
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (US/International formats)
  // Matches: (555) 123-4567, 555-123-4567, +1-555-123-4567, etc.
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // IP Addresses (IPv4)
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

// Replacement texts
const REDACTION_REPLACEMENTS = {
  ssn: '[SSN_REDACTED]',
  creditCard: '[CARD_REDACTED]',
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  ipAddress: '[IP_REDACTED]',
};

/**
 * Redact PII from text using configured patterns
 * @param text The text to redact
 * @param config Redaction configuration (which patterns to apply)
 * @returns Redacted text
 */
export function redactPII(
  text: string,
  config: RedactionConfig = DEFAULT_REDACTION_CONFIG
): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let redacted = text;

  // Apply SSN redaction
  if (config.ssn !== false) {
    redacted = redacted.replace(PII_PATTERNS.ssn, REDACTION_REPLACEMENTS.ssn);
  }

  // Apply credit card redaction
  if (config.creditCard !== false) {
    redacted = redacted.replace(PII_PATTERNS.creditCard, REDACTION_REPLACEMENTS.creditCard);
  }

  // Apply email redaction
  if (config.email !== false) {
    redacted = redacted.replace(PII_PATTERNS.email, REDACTION_REPLACEMENTS.email);
  }

  // Apply phone redaction
  if (config.phone !== false) {
    redacted = redacted.replace(PII_PATTERNS.phone, REDACTION_REPLACEMENTS.phone);
  }

  // Apply IP address redaction (optional)
  if (config.ipAddress === true) {
    redacted = redacted.replace(PII_PATTERNS.ipAddress, REDACTION_REPLACEMENTS.ipAddress);
  }

  // Apply custom patterns
  if (config.customPatterns) {
    for (const { pattern, replacement } of config.customPatterns) {
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return redacted;
}

/**
 * Detect if text contains PII (without redacting)
 * Useful for logging/auditing
 * @param text The text to check
 * @returns Object indicating which PII types were found
 */
export function detectPII(text: string): {
  hasPII: boolean;
  ssn: boolean;
  creditCard: boolean;
  email: boolean;
  phone: boolean;
  ipAddress: boolean;
} {
  if (!text || typeof text !== 'string') {
    return {
      hasPII: false,
      ssn: false,
      creditCard: false,
      email: false,
      phone: false,
      ipAddress: false,
    };
  }

  const detected = {
    ssn: PII_PATTERNS.ssn.test(text),
    creditCard: PII_PATTERNS.creditCard.test(text),
    email: PII_PATTERNS.email.test(text),
    phone: PII_PATTERNS.phone.test(text),
    ipAddress: PII_PATTERNS.ipAddress.test(text),
  };

  return {
    hasPII: Object.values(detected).some(v => v),
    ...detected,
  };
}

/**
 * Redact PII from multiple fields in an object
 * @param obj The object with fields to redact
 * @param fields Array of field names to redact
 * @param config Redaction configuration
 * @returns New object with redacted fields
 */
export function redactPIIFromObject<T extends Record<string, any>>(
  obj: T,
  fields: Array<keyof T>,
  config: RedactionConfig = DEFAULT_REDACTION_CONFIG
): T {
  const redacted = { ...obj };

  for (const field of fields) {
    if (typeof redacted[field] === 'string') {
      redacted[field] = redactPII(redacted[field], config) as any;
    }
  }

  return redacted;
}

/**
 * Redact PII from conversation messages array
 * Convenience wrapper for common use case
 */
export interface ConversationMessage {
  role: string;
  content: string;
  [key: string]: any;
}

export function redactPIIFromMessages(
  messages: ConversationMessage[],
  config: RedactionConfig = DEFAULT_REDACTION_CONFIG
): ConversationMessage[] {
  return messages.map(message => ({
    ...message,
    content: redactPII(message.content, config),
  }));
}

/**
 * Mask credit card numbers for display (show last 4 digits only)
 * Different from full redaction - useful for receipts/confirmations
 * @param cardNumber The card number to mask
 * @returns Masked card number: **** **** **** 1234
 */
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) {
    return '****';
  }

  const cleaned = cardNumber.replace(/\D/g, '');
  const last4 = cleaned.slice(-4);

  if (cleaned.length === 16) {
    return `**** **** **** ${last4}`;
  } else if (cleaned.length === 15) {
    return `**** ****** *${last4}`;
  }

  return `**** ${last4}`;
}

/**
 * Mask email for display (show first 3 chars + domain)
 * @param email The email to mask
 * @returns Masked email: abc***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***';
  }

  const [local, domain] = email.split('@');

  if (local.length <= 3) {
    return `***@${domain}`;
  }

  return `${local.substring(0, 3)}***@${domain}`;
}

/**
 * Mask phone number for display (show last 4 digits only)
 * @param phone The phone number to mask
 * @returns Masked phone: ***-***-1234
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 4) {
    return '***';
  }

  const last4 = cleaned.slice(-4);
  return `***-***-${last4}`;
}

/**
 * Log PII detection for audit trail
 * Useful for compliance reporting
 */
export function logPIIDetection(
  text: string,
  context: { businessId?: string; conversationId?: string; userId?: string }
) {
  const detection = detectPII(text);

  if (detection.hasPII) {
    console.warn('[PII Detection]', {
      ...context,
      detected: {
        ssn: detection.ssn,
        creditCard: detection.creditCard,
        email: detection.email,
        phone: detection.phone,
        ipAddress: detection.ipAddress,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Validate that PII redaction is working correctly
 * Used in tests and health checks
 */
export function validateRedaction(): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Test SSN redaction
  const ssnTest = redactPII('My SSN is 123-45-6789.');
  if (ssnTest.includes('123-45-6789')) {
    errors.push('SSN redaction failed');
  }

  // Test credit card redaction
  const ccTest = redactPII('Card: 4111-1111-1111-1111');
  if (ccTest.includes('4111-1111-1111-1111')) {
    errors.push('Credit card redaction failed');
  }

  // Test email redaction
  const emailTest = redactPII('Email me at user@example.com');
  if (emailTest.includes('user@example.com')) {
    errors.push('Email redaction failed');
  }

  // Test phone redaction
  const phoneTest = redactPII('Call (555) 123-4567');
  if (phoneTest.includes('(555) 123-4567')) {
    errors.push('Phone redaction failed');
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
