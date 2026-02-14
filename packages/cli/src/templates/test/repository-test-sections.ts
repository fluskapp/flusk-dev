/** @generated —
 * Repository test template sections
 * Individual test section generators for repository tests
 */

/**
 * Generate CRUD create test section
 */
export function getCreateTests(entityName: string): string {
  return `
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
  });`;
}

/**
 * Generate find/read test sections
 */
export function getReadTests(entityName: string): string {
  return `

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
  });`;
}
