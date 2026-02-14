import { createDecipheriv, scryptSync } from 'crypto';
import { getLogger } from '@flusk/logger';

const logger = getLogger().child({ module: 'decrypt' });

/**
 * Decryption configuration
 * Matches encryption settings (AES-256-GCM)
 */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

/**
 * Derive decryption key from password using scrypt
 * @param password - Encryption key from environment
 * @param salt - Salt used during encryption
 * @returns Derived 256-bit key
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param ciphertext - Encrypted data in format: salt:iv:authTag:ciphertext
 * @param encryptionKey - Encryption key from ENCRYPTION_KEY env var
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or data is corrupted
 */
export function decrypt(ciphertext: string, encryptionKey?: string): string {
  const key = encryptionKey || process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  if (!ciphertext) {
    return '';
  }

  // Parse encrypted data format: salt:iv:authTag:ciphertext
  const parts = ciphertext.split(':');

  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltB64, ivB64, authTagB64, encryptedData] = parts;

  // Decode base64 components
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  // Derive key from password
  const derivedKey = deriveKey(key, salt);

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  // Decrypt data
  let plaintext = decipher.update(encryptedData, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Decrypt multiple fields in an object
 * @param data - Object with encrypted fields
 * @param fields - Field names to decrypt
 * @param encryptionKey - Optional encryption key (defaults to env var)
 * @returns New object with decrypted fields
 */
export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[],
  encryptionKey?: string
): T {
  const result = { ...data };

  for (const field of fields) {
    const value = data[field];
    if (typeof value === 'string' && value) {
      try {
        result[field] = decrypt(value, encryptionKey) as T[keyof T];
      } catch (err) {
        // If decryption fails, field might not be encrypted (migration case)
        // Leave it as-is and log warning
        logger.warn({ field: String(field), err }, 'failed to decrypt field');
      }
    }
  }

  return result;
}
