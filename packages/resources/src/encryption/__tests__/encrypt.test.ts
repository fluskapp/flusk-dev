import { describe, it, expect } from 'vitest';
import { encrypt, encryptFields } from '../encrypt.js';

describe('encrypt', () => {
  const TEST_KEY = 'test-encryption-key-32-chars-ok!';

  it('encrypts plaintext to salt:iv:authTag:ciphertext format', () => {
    const result = encrypt('hello world', TEST_KEY);
    const parts = result.split(':');
    expect(parts).toHaveLength(4);
    // All parts should be non-empty base64
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it('returns empty string for empty input', () => {
    expect(encrypt('', TEST_KEY)).toBe('');
  });

  it('produces different ciphertexts for same input (random salt/iv)', () => {
    const a = encrypt('same text', TEST_KEY);
    const b = encrypt('same text', TEST_KEY);
    expect(a).not.toBe(b);
  });

  it('throws when no key provided and env not set', () => {
    const orig = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('hello')).toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = orig;
  });

  it('uses ENCRYPTION_KEY env var when no key argument', () => {
    const orig = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const result = encrypt('hello');
    expect(result.split(':')).toHaveLength(4);
    process.env.ENCRYPTION_KEY = orig;
  });
});

describe('encryptFields', () => {
  const KEY = 'test-key-for-fields-encryption!!';

  it('encrypts specified string fields', () => {
    const data = { name: 'secret', age: 42, note: 'private' };
    const result = encryptFields(data, ['name', 'note'], KEY);
    expect(result.name).not.toBe('secret');
    expect(result.note).not.toBe('private');
    expect(result.age).toBe(42);
  });

  it('skips non-string and empty fields', () => {
    const data = { a: '', b: 123, c: 'val' };
    const result = encryptFields(data, ['a', 'b', 'c'], KEY);
    expect(result.a).toBe('');
    expect(result.b).toBe(123);
    expect(result.c).not.toBe('val');
  });
});
