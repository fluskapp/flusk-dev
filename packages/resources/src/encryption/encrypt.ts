import { createCipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Encryption configuration
 * Uses AES-256-GCM for authenticated encryption
 */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Derive encryption key from password using scrypt
 * @param password - Encryption key from environment
 * @param salt - Random salt for key derivation
 * @returns Derived 256-bit key
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Encrypt sensitive data with AES-256-GCM
 * @param plaintext - Data to encrypt (PII, prompts, responses)
 * @param encryptionKey - Encryption key from ENCRYPTION_KEY env var
 * @returns Encrypted data in format: salt:iv:authTag:ciphertext (base64)
 * @throws Error if encryption key is missing or encryption fails
 */
export function encrypt(plaintext: string, encryptionKey?: string): string {
  const key = encryptionKey || process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  if (!plaintext) {
    return '';
  }

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from password
  const derivedKey = deriveKey(key, salt);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

  // Encrypt data
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Return format: salt:iv:authTag:ciphertext
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext
  ].join(':');
}

/**
 * Encrypt multiple fields in an object
 * @param data - Object with fields to encrypt
 * @param fields - Field names to encrypt
 * @param encryptionKey - Optional encryption key (defaults to env var)
 * @returns New object with encrypted fields
 */
export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[],
  encryptionKey?: string
): T {
  const result = { ...data };

  for (const field of fields) {
    const value = data[field];
    if (typeof value === 'string' && value) {
      result[field] = encrypt(value, encryptionKey) as T[keyof T];
    }
  }

  return result;
}
