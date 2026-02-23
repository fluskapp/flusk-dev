/**
 * Custom section template for HTTP client (the client class with CRUD methods).
 */

export function generateHttpClientCustomSection(
  pascal: string,
  clientName: string,
  envKey: string,
): string {
  return `
// --- BEGIN CUSTOM ---
export class ${pascal}Client {
  private readonly baseUrl: string;
  private readonly retryOpts: RetryOptions;

  constructor(baseUrl?: string, retryOpts?: RetryOptions) {
    this.baseUrl = baseUrl
      ?? process.env['${envKey}_URL']
      ?? 'http://localhost:3000';
    this.retryOpts = retryOpts ?? {};
    validateUrl(this.baseUrl);
  }

  async get<T = unknown>(path: string): Promise<T> {
    const url = \`\${this.baseUrl}\${path}\`;
    validateUrl(url);
    return withRetry(async () => {
      const res = await request(url, { method: 'GET' });
      const body = await res.body.json() as T;
      log.info({ url, status: res.statusCode }, '${clientName} GET');
      return body;
    }, this.retryOpts);
  }

  async post<T = unknown>(path: string, data: unknown): Promise<T> {
    const url = \`\${this.baseUrl}\${path}\`;
    validateUrl(url);
    return withRetry(async () => {
      const res = await request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.body.json() as T;
      log.info({ url, status: res.statusCode }, '${clientName} POST');
      return body;
    }, this.retryOpts);
  }

  async put<T = unknown>(path: string, data: unknown): Promise<T> {
    const url = \`\${this.baseUrl}\${path}\`;
    validateUrl(url);
    return withRetry(async () => {
      const res = await request(url, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.body.json() as T;
      log.info({ url, status: res.statusCode }, '${clientName} PUT');
      return body;
    }, this.retryOpts);
  }

  async delete(path: string): Promise<void> {
    const url = \`\${this.baseUrl}\${path}\`;
    validateUrl(url);
    return withRetry(async () => {
      const res = await request(url, { method: 'DELETE' });
      log.info({ url, status: res.statusCode }, '${clientName} DELETE');
    }, this.retryOpts);
  }
}
// --- END CUSTOM ---`;
}
