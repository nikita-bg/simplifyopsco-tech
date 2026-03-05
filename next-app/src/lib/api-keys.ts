/**
 * API Key Generation and Validation Utilities
 *
 * Format: so_live_<32-char-random> or so_test_<32-char-random>
 * Storage: bcrypt hashed in businesses.api_key_hash
 *
 * Security:
 * - API keys are hashed with bcrypt before storage
 * - Keys are only shown once during generation
 * - Prefix stored separately for display (so_live_abc...)
 */

import { customAlphabet } from 'nanoid';
import bcrypt from 'bcryptjs';

// Custom alphabet: alphanumeric without ambiguous characters (0, O, I, l)
const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 32);

export const API_KEY_SALT_ROUNDS = 10;

export type ApiKeyEnvironment = 'live' | 'test';

export interface GeneratedApiKey {
  key: string; // Full API key (show only once!)
  hash: string; // bcrypt hash for database storage
  prefix: string; // Display prefix: "so_live_abc..."
  environment: ApiKeyEnvironment;
}

/**
 * Generate a new API key for a business
 * @param environment 'live' for production, 'test' for sandbox
 * @returns Generated key with hash and prefix
 */
export async function generateApiKey(
  environment: ApiKeyEnvironment = 'live'
): Promise<GeneratedApiKey> {
  const randomPart = nanoid();
  const key = `so_${environment}_${randomPart}`;

  // Hash the full key for storage
  const hash = await bcrypt.hash(key, API_KEY_SALT_ROUNDS);

  // Store first 12 characters as prefix for display
  const prefix = key.substring(0, 15) + '...'; // "so_live_abc123..."

  return {
    key,
    hash,
    prefix,
    environment,
  };
}

/**
 * Validate an API key against its stored hash
 * @param apiKey The API key to validate
 * @param storedHash The bcrypt hash from database
 * @returns True if key is valid
 */
export async function validateApiKey(
  apiKey: string,
  storedHash: string
): Promise<boolean> {
  if (!apiKey || !storedHash) {
    return false;
  }

  // Validate key format first (fast check before expensive bcrypt)
  if (!isValidApiKeyFormat(apiKey)) {
    return false;
  }

  try {
    return await bcrypt.compare(apiKey, storedHash);
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

/**
 * Check if API key has valid format (without database lookup)
 * Format: so_<env>_<32-chars>
 * @param apiKey The key to check
 * @returns True if format is valid
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Must start with so_live_ or so_test_
  if (!apiKey.startsWith('so_live_') && !apiKey.startsWith('so_test_')) {
    return false;
  }

  // Must have exactly 32 characters after prefix
  const parts = apiKey.split('_');
  if (parts.length !== 3) {
    return false;
  }

  const randomPart = parts[2];
  if (randomPart.length !== 32) {
    return false;
  }

  // Only allowed characters (alphanumeric)
  if (!/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(randomPart)) {
    return false;
  }

  return true;
}

/**
 * Extract environment from API key
 * @param apiKey The API key
 * @returns 'live' or 'test', or null if invalid
 */
export function getApiKeyEnvironment(apiKey: string): ApiKeyEnvironment | null {
  if (apiKey.startsWith('so_live_')) {
    return 'live';
  }
  if (apiKey.startsWith('so_test_')) {
    return 'test';
  }
  return null;
}

/**
 * Mask an API key for safe logging/display
 * @param apiKey The key to mask
 * @returns Masked key: "so_live_abc...xyz"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 15) {
    return '***';
  }

  const prefix = apiKey.substring(0, 12); // "so_live_abc1"
  const suffix = apiKey.substring(apiKey.length - 3); // "xyz"

  return `${prefix}...${suffix}`;
}

/**
 * Generate a test API key for development/testing
 * Convenience wrapper around generateApiKey
 */
export async function generateTestApiKey(): Promise<GeneratedApiKey> {
  return generateApiKey('test');
}

/**
 * Rotate an API key (generate new one, old one should be invalidated)
 * @param environment The environment for new key
 * @returns New generated key
 */
export async function rotateApiKey(
  environment: ApiKeyEnvironment = 'live'
): Promise<GeneratedApiKey> {
  // Generate new key
  const newKey = await generateApiKey(environment);

  // NOTE: Caller is responsible for:
  // 1. Updating database with new hash
  // 2. Invalidating old key
  // 3. Notifying business owner of new key

  return newKey;
}
