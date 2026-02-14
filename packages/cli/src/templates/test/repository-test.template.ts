/** @generated —
 * Repository Test Template Generator
 * Generates test files for database repository classes
 */

import { getCreateTests, getReadTests } from './repository-test-sections.js';
import { getUpdateTests, getDeleteTests, getSearchAndTransactionTests } from './repository-test-mutations.js';

export interface RepositoryTestTemplateOptions {
  fileName: string;
  importPath: string;
  className: string;
  entityName: string;
}

export function generateRepositoryTestTemplate(options: RepositoryTestTemplateOptions): string {
  const { fileName: _fileName, importPath, className, entityName } = options;

  return `import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { ${className} } from '${importPath}';
import { testDb } from '../test-helpers/database.js';

/**
 * Repository Tests for ${className}
 *
 * These tests verify database operations including CRUD operations,
 * queries, transactions, and data integrity.
 *
 * Test Coverage:
 * - Create operations
 * - Read operations (findById, findAll, search)
 * - Update operations
 * - Delete operations (soft delete, hard delete)
 * - Transaction handling
 * - Constraint validation
 * - Index performance
 */

describe('${className}', () => {
  let repository: ${className};

  beforeEach(async () => {
    // Setup test database
    await testDb.migrate.latest();
    await testDb.seed.run();
    repository = new ${className}(testDb);
  });

  afterEach(async () => {
    // Cleanup test database
    await testDb.migrate.rollback();
  });

  afterAll(async () => {
    await testDb.destroy();
  });
${getCreateTests(entityName)}
${getReadTests(entityName)}
${getUpdateTests(entityName)}
${getDeleteTests(entityName)}
${getSearchAndTransactionTests(entityName)}
});
`;
}
