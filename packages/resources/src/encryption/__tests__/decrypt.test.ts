import { describe, it, expect, vi } from 'vitest';

vi.mock('@flusk/logger', () => ({
  getLogger: () => ({ child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) }),
}));

import { decrypt, decryptFields } from '../decrypt.js';

describe('decrypt', () => {
  const KEY = 'test-encryption-key-32-chars-ok!';

  it('returns empty string for empty input', () => {
    expect(decrypt('', KEY)).toBe('');
  });

  it('throws for invalid format (not 4 parts)', () => {
    expect(() => decrypt('only:two:parts', KEY)).toThrow('Invalid encrypted data format');
  });

  it('throws when no key and env not set', () => {
    const orig = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => decrypt('a:b:c:d')).toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = orig;
  });

  it('throws for tampered ciphertext', async () => {
    const { encrypt } = await import('../encrypt.js');
    const encrypted = encrypt('hello', KEY);
    const parts = encrypted.split(':');
    parts[3] = 'TAMPERED';
    expect(() => decrypt(parts.join(':'), KEY)).toThrow();
  });
});

describe('decryptFields', () => {
  const KEY = 'test-key-for-fields-encryption!!';

  it('silently skips fields that fail to decrypt', () => {
    const data = { secret: 'not:valid:encrypted:data', plain: 'ok' };
    const result = decryptFields(data, ['secret'], KEY);
    // Should keep original value on failure
    expect(result.secret).toBe('not:valid:encrypted:data');
    expect(result.plain).toBe('ok');
  });

  it('skips non-string and empty fields', () => {
    const data = { a: '', b: 42 };
    const result = decryptFields(data, ['a', 'b'], KEY);
    expect(result.a).toBe('');
    expect(result.b).toBe(42);
  });
});
