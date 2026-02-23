/**
 * Repository test template — search and transaction test sections
 */

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
