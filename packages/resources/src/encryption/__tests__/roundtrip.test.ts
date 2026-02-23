import { describe, it, expect, vi } from 'vitest';

vi.mock('@flusk/logger', () => ({
  getLogger: () => ({ child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) }),
}));

import { encrypt, encryptFields } from '../encrypt.js';
import { decrypt, decryptFields } from '../decrypt.js';

describe('encrypt/decrypt roundtrip', () => {
  const KEY = 'roundtrip-test-key-32-chars-ok!!';

  it('round-trips simple text', () => {
    const plain = 'hello world';
    expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain);
  });

  it('round-trips unicode text', () => {
    const plain = '日本語テスト 🎉 ñoño';
    expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain);
  });

  it('round-trips long text', () => {
    const plain = 'x'.repeat(100_000);
    expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain);
  });

  it('fails with wrong key', () => {
    const encrypted = encrypt('secret', KEY);
    expect(() => decrypt(encrypted, 'wrong-key-that-is-also-32chars!')).toThrow();
  });

  it('round-trips fields on objects', () => {
    const data = { apiKey: 'sk-secret-123', name: 'public' };
    const encrypted = encryptFields(data, ['apiKey'], KEY);
    const decrypted = decryptFields(encrypted, ['apiKey'], KEY);
    expect(decrypted.apiKey).toBe('sk-secret-123');
    expect(decrypted.name).toBe('public');
  });
});

describe('key rotation', () => {
  const OLD_KEY = 'old-key-for-rotation-test-32ch!!';
  const NEW_KEY = 'new-key-for-rotation-test-32ch!!';

  it('re-encrypts data with new key', () => {
    const plain = 'sensitive data';
    const encryptedOld = encrypt(plain, OLD_KEY);
    const decrypted = decrypt(encryptedOld, OLD_KEY);
    const encryptedNew = encrypt(decrypted, NEW_KEY);
    expect(decrypt(encryptedNew, NEW_KEY)).toBe(plain);
    expect(() => decrypt(encryptedNew, OLD_KEY)).toThrow();
  });
});
