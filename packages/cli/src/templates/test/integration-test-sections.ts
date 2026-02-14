/** @generated —
 * Integration test template sections
 * Generates individual template parts for integration tests
 */

/**
 * Generate database setup/teardown section
 */
export function getDatabaseSetup(hasDatabase: boolean): string {
  if (!hasDatabase) return '';
  return `
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
`;
}

/**
 * Generate external API mock section
 */
export function getExternalApiMocks(hasExternalApi: boolean): string {
  if (!hasExternalApi) return '';
  return `
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
`;
}

/**
 * Generate fallback integration test section (no endpoint)
 */
export function getFallbackTests(): string {
  return `
  describe('Integration Tests', () => {
    it('should integrate components successfully', async () => {
      // Test integration between components
      expect(true).toBe(true);
    });
  });
`;
}
