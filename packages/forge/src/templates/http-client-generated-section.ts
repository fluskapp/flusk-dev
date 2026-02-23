/**
 * Generated section template for HTTP client (SSRF protection + retry logic).
 */

export function generateHttpClientGeneratedSection(
  clientName: string,
): string {
  return `// --- BEGIN GENERATED ---
import { request } from 'undici';
import { createLogger } from '@flusk/logger';

const log = createLogger({ name: '${clientName}-client' });

const PRIVATE_IP_PATTERNS = [
  /^127\\./,
  /^10\\./,
  /^172\\.(1[6-9]|2\\d|3[01])\\./,
  /^192\\.168\\./,
  /^169\\.254\\./,
  /^0\\./,
];

function validateUrl(rawUrl: string): void {
  const parsed = new URL(rawUrl);
  const isDev = process.env['NODE_ENV'] === 'development'
    || process.env['NODE_ENV'] === 'test';
  if (isDev) return;

  if (parsed.protocol !== 'https:') {
    throw new Error(\`URL must use HTTPS (got \${parsed.protocol})\`);
  }
  const host = parsed.hostname;
  if (host === '::1' || host === 'localhost' || host === '127.0.0.1'
    || host.startsWith('fc') || host.startsWith('fd')) {
    throw new Error(\`URL blocked: private/reserved address (\${host})\`);
  }
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(host)) {
      throw new Error(\`URL blocked: private IP range (\${host})\`);
    }
  }
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 500;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        log.warn({ attempt, err }, '${clientName} request failed, retrying');
      }
    }
  }
  throw lastError;
}
// --- END GENERATED ---`;
}
