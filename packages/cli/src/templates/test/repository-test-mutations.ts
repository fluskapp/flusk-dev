/** @generated —
 * Repository test template mutation sections
 * Update, delete, search, and transaction test generators
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

/**
 * Generate search and transaction test sections
 */
export function getSearchAndTransactionTests(entityName: string): string {
  return `

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
  });`;
}
