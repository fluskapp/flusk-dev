/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { scryptSync } from 'crypto';

/** AES-256-GCM encryption constants */
export const ALGORITHM = 'aes-256-gcm';
export const KEY_LENGTH = 32;
export const IV_LENGTH = 16;
export const SALT_LENGTH = 32;

/** Derive encryption key from password using scrypt */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}
