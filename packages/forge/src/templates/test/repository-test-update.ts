/**
 * Repository test template — update test section
 */

/**
 * Generate update test section
 */
export function getUpdateTests(entityName: string): string {
  return `

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
  });`;
}
