/**
 * Repository Test Template Generator
 * Generates test files for database repository classes
 */

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

  describe('create', () => {
    it('should create new ${entityName} successfully', async () => {
      // Arrange
      const data = {
        name: 'Test ${entityName}',
        // Add other required fields
      };

      // Act
      const result = await repository.create(data);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(data.name);
    });

    it('should throw error for duplicate unique field', async () => {
      // Arrange
      const data = {
        name: 'Duplicate ${entityName}',
        email: 'test@example.com',
      };
      await repository.create(data);

      // Act & Assert
      await expect(repository.create(data)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {};

      // Act & Assert
      await expect(repository.create(invalidData as any)).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      // Arrange
      const data = { name: 'Test ${entityName}' };

      // Act
      const result = await repository.create(data);

      // Assert
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find ${entityName} by ID', async () => {
      // Arrange
      const created = await repository.create({ name: 'Test ${entityName}' });

      // Act
      const result = await repository.findById(created.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all ${entityName}s', async () => {
      // Arrange
      await repository.create({ name: 'Test 1' });
      await repository.create({ name: 'Test 2' });
      await repository.create({ name: 'Test 3' });

      // Act
      const results = await repository.findAll();

      // Assert
      expect(results).toHaveLength(3);
    });

    it('should support pagination', async () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        await repository.create({ name: \`Test \${i}\` });
      }

      // Act
      const results = await repository.findAll({ limit: 5, offset: 0 });

      // Assert
      expect(results).toHaveLength(5);
    });

    it('should support sorting', async () => {
      // Arrange
      await repository.create({ name: 'C' });
      await repository.create({ name: 'A' });
      await repository.create({ name: 'B' });

      // Act
      const results = await repository.findAll({ sortBy: 'name', order: 'ASC' });

      // Assert
      expect(results[0].name).toBe('A');
      expect(results[1].name).toBe('B');
      expect(results[2].name).toBe('C');
    });
  });

  describe('update', () => {
    it('should update ${entityName} successfully', async () => {
      // Arrange
      const created = await repository.create({ name: 'Original' });
      const updates = { name: 'Updated' };

      // Act
      const result = await repository.update(created.id, updates);

      // Assert
      expect(result.name).toBe('Updated');
      expect(result.updatedAt).not.toBe(created.updatedAt);
    });

    it('should throw error for non-existent ID', async () => {
      // Arrange
      const updates = { name: 'Updated' };

      // Act & Assert
      await expect(repository.update('non-existent-id', updates)).rejects.toThrow();
    });

    it('should validate update data', async () => {
      // Arrange
      const created = await repository.create({ name: 'Test' });
      const invalidUpdates = { invalid: true };

      // Act & Assert
      await expect(repository.update(created.id, invalidUpdates as any)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should soft delete ${entityName}', async () => {
      // Arrange
      const created = await repository.create({ name: 'Test' });

      // Act
      await repository.delete(created.id);

      // Assert
      const result = await repository.findById(created.id);
      expect(result).toBeNull();
    });

    it('should hard delete ${entityName}', async () => {
      // Arrange
      const created = await repository.create({ name: 'Test' });

      // Act
      await repository.hardDelete(created.id);

      // Assert
      const result = await repository.findById(created.id, { includeDeleted: true });
      expect(result).toBeNull();
    });

    it('should throw error for non-existent ID', async () => {
      // Act & Assert
      await expect(repository.delete('non-existent-id')).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('should search ${entityName}s by name', async () => {
      // Arrange
      await repository.create({ name: 'Apple' });
      await repository.create({ name: 'Banana' });
      await repository.create({ name: 'Apricot' });

      // Act
      const results = await repository.search({ name: 'Ap' });

      // Assert
      expect(results).toHaveLength(2);
    });

    it('should support complex filters', async () => {
      // Arrange
      await repository.create({ name: 'Test 1', status: 'active' });
      await repository.create({ name: 'Test 2', status: 'inactive' });

      // Act
      const results = await repository.search({ status: 'active' });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('active');
    });
  });

  describe('transactions', () => {
    it('should rollback on error', async () => {
      // Arrange
      const trx = await testDb.transaction();

      try {
        // Act
        await repository.create({ name: 'Test 1' }, { transaction: trx });
        throw new Error('Simulated error');
      } catch (error) {
        await trx.rollback();
      }

      // Assert
      const results = await repository.findAll();
      expect(results).toHaveLength(0);
    });

    it('should commit on success', async () => {
      // Arrange
      const trx = await testDb.transaction();

      // Act
      await repository.create({ name: 'Test 1' }, { transaction: trx });
      await trx.commit();

      // Assert
      const results = await repository.findAll();
      expect(results).toHaveLength(1);
    });
  });
});
`;
}
