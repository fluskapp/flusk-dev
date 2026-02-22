/**
 * HTTP client generator — produces a typed HTTP client with
 * SSRF protection, retries, and standard CRUD methods.
 *
 * WHY: All HTTP clients in Flusk follow the same pattern.
 * This generator ensures consistency and security by default.
 */

import { resolve } from 'node:path';
import {
  generateHttpClientTemplate,
} from '../templates/http-client.template.js';

export interface HttpClientGeneratorOptions {
  clientName: string;
  baseUrlConfigKey: string;
  projectRoot: string;
}

export interface HttpClientResult {
  content: string;
  outputPath: string;
}

/**
 * Generate HTTP client file content.
 */
export function generateHttpClient(
  opts: HttpClientGeneratorOptions,
): HttpClientResult {
  const { clientName, baseUrlConfigKey, projectRoot } = opts;

  const content = generateHttpClientTemplate({
    clientName,
    baseUrlConfigKey,
  });
  const outputPath = resolve(
    projectRoot,
    `packages/resources/src/clients/${clientName}.client.ts`,
  );

  return { content, outputPath };
}
