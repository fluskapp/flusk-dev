/**
 * Integration Test Template Generator
 * Generates integration test files for API endpoints, services with dependencies
 */

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

  const databaseSetup = hasDatabase ? `
  beforeEach(async () => {
    // Setup test database
    await testDb.migrate.latest();
    await testDb.seed.run();
  });

  afterEach(async () => {
    // Cleanup test database
    await testDb.migrate.rollback();
  });

  afterAll(async () => {
    await testDb.destroy();
  });
` : '';

  const externalApiMocks = hasExternalApi ? `
  beforeEach(() => {
    // Mock external API calls
    vi.mock('axios', () => ({
      default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      }
    }));
  });
` : '';

  const endpointTests = endpoint ? `
  describe('${method} ${endpoint}', () => {
    it('should return 200 for valid request', async () => {
      // Arrange
      const payload = {};

      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toBeDefined();
    });

    it('should return 400 for invalid request', async () => {
      // Arrange
      const invalidPayload = { invalid: true };

      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
        payload: invalidPayload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });

    it('should return 401 for unauthorized request', async () => {
      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it('should return 500 for server error', async () => {
      // Arrange - Mock service to throw error
      vi.spyOn(service, 'execute').mockRejectedValue(new Error('Server error'));

      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
        payload: {},
      });

      // Assert
      expect(response.statusCode).toBe(500);
    });

    it('should validate request schema', async () => {
      // Arrange
      const payload = { requiredField: 'value' };

      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });

    it('should return expected response format', async () => {
      // Arrange
      const payload = {};

      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
        payload,
      });

      // Assert
      const json = response.json();
      expect(json).toMatchObject({
        data: expect.any(Object),
      });
    });
  });
` : `
  describe('Integration Tests', () => {
    it('should integrate components successfully', async () => {
      // Test integration between components
      expect(true).toBe(true);
    });
  });
`;

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
