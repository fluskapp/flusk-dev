/**
 * Repository test template — delete test section
 */

/**
 * Generate delete test section
 */
export function getDeleteTests(entityName: string): string {
  return `

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
  });`;
}
