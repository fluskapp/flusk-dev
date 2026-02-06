/**
 * Encrypt sensitive data with AES-256-GCM
 * @param plaintext - Data to encrypt (PII, prompts, responses)
 * @param encryptionKey - Encryption key from ENCRYPTION_KEY env var
 * @returns Encrypted data in format: salt:iv:authTag:ciphertext (base64)
 * @throws Error if encryption key is missing or encryption fails
 */
export declare function encrypt(plaintext: string, encryptionKey?: string): string;
/**
 * Encrypt multiple fields in an object
 * @param data - Object with fields to encrypt
 * @param fields - Field names to encrypt
 * @param encryptionKey - Optional encryption key (defaults to env var)
 * @returns New object with encrypted fields
 */
export declare function encryptFields<T extends Record<string, any>>(data: T, fields: (keyof T)[], encryptionKey?: string): T;
//# sourceMappingURL=encrypt.d.ts.map