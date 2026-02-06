/**
 * Decrypt data encrypted with AES-256-GCM
 * @param ciphertext - Encrypted data in format: salt:iv:authTag:ciphertext
 * @param encryptionKey - Encryption key from ENCRYPTION_KEY env var
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or data is corrupted
 */
export declare function decrypt(ciphertext: string, encryptionKey?: string): string;
/**
 * Decrypt multiple fields in an object
 * @param data - Object with encrypted fields
 * @param fields - Field names to decrypt
 * @param encryptionKey - Optional encryption key (defaults to env var)
 * @returns New object with decrypted fields
 */
export declare function decryptFields<T extends Record<string, any>>(data: T, fields: (keyof T)[], encryptionKey?: string): T;
//# sourceMappingURL=decrypt.d.ts.map