/**
 * Repository test template — create test section
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
