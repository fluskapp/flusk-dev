import { describe, it, expect } from 'vitest';
import { deriveKey, ALGORITHM, KEY_LENGTH, IV_LENGTH, SALT_LENGTH } from '../crypto-utils.js';
import { randomBytes } from 'crypto';

describe('crypto-utils constants', () => {
  it('uses AES-256-GCM', () => {
    expect(ALGORITHM).toBe('aes-256-gcm');
  });

  it('has correct key length', () => {
    expect(KEY_LENGTH).toBe(32);
  });

  it('has correct IV and salt lengths', () => {
    expect(IV_LENGTH).toBe(16);
    expect(SALT_LENGTH).toBe(32);
  });
});

describe('deriveKey', () => {
  it('returns a buffer of KEY_LENGTH bytes', () => {
    const salt = randomBytes(SALT_LENGTH);
    const key = deriveKey('password', salt);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(KEY_LENGTH);
  });

  it('produces same key for same password+salt', () => {
    const salt = randomBytes(SALT_LENGTH);
    const a = deriveKey('password', salt);
    const b = deriveKey('password', salt);
    expect(a.equals(b)).toBe(true);
  });

  it('produces different keys for different salts', () => {
    const a = deriveKey('password', randomBytes(SALT_LENGTH));
    const b = deriveKey('password', randomBytes(SALT_LENGTH));
    expect(a.equals(b)).toBe(false);
  });

  it('produces different keys for different passwords', () => {
    const salt = randomBytes(SALT_LENGTH);
    const a = deriveKey('password1', salt);
    const b = deriveKey('password2', salt);
    expect(a.equals(b)).toBe(false);
  });
});
