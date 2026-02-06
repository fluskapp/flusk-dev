# Encryption Package

AES-256-GCM encryption for PII protection (GDPR compliance).

## Usage

### Encrypt Single Field
```typescript
import { encrypt, decrypt } from '@flusk/resources';

const plaintext = "Sensitive user data";
const encrypted = encrypt(plaintext);
// Returns: "salt:iv:authTag:ciphertext" (base64)

const decrypted = decrypt(encrypted);
// Returns: "Sensitive user data"
```

### Encrypt Multiple Fields
```typescript
import { encryptFields, decryptFields } from '@flusk/resources';

const data = {
  id: '123',
  prompt: 'Secret prompt',
  response: 'Secret response',
  cached: false
};

const encrypted = encryptFields(data, ['prompt', 'response']);
const decrypted = decryptFields(encrypted, ['prompt', 'response']);
```

## Environment Setup
```bash
# Generate secure 256-bit key
export ENCRYPTION_KEY=$(openssl rand -base64 32)
```

## Security Notes
- Uses AES-256-GCM (authenticated encryption)
- Random IV per encryption (prevents pattern analysis)
- Salt-based key derivation (scrypt)
- Authentication tag prevents tampering
- Key rotation recommended every 90 days
