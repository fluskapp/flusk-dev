/** @generated —
 * Integration Test Template Generator
 * Generates integration test files for API endpoints, services with dependencies
 */

import { getDatabaseSetup, getExternalApiMocks, getFallbackTests } from './integration-test-sections.js';
import { getEndpointTests } from './integration-test-endpoint.js';

export interface IntegrationTestTemplateOptions {
  fileName: string;
  importPath: string;
  endpoint?: string;
  method?: string;
  hasDatabase?: boolean;
  hasExternalApi?: boolean;
}

export function generateIntegrationTestTemplate(options: IntegrationTestTemplateOptions): string {
  const { fileName, importPath: _importPath, endpoint, method = 'GET', hasDatabase = false, hasExternalApi = false } = options;

  const databaseSetup = getDatabaseSetup(hasDatabase);
  const externalApiMocks = getExternalApiMocks(hasExternalApi);
  const endpointTests = endpoint ? getEndpointTests(endpoint, method) : getFallbackTests();

  return `import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
${hasDatabase ? "import { testDb } from '../test-helpers/database.js';" : ''}

/**
 * Integration Tests for ${fileName}
 *
 * These tests verify the interaction between multiple components,
 * including database operations, external API calls, and service integrations.
 *
 * Test Coverage:
 * - End-to-end request/response flow
 * - Database integration
 * - External API integration
 * - Authentication and authorization
 * - Error handling across components
 * - Response format validation
 */

describe('${fileName} - Integration', () => {
  let app: ReturnType<typeof Fastify>;
${databaseSetup}
${externalApiMocks}

  beforeEach(async () => {
    app = Fastify({ logger: false });
    // Register plugins and routes
    // await app.register(...);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });
${endpointTests}
});
`;
}
