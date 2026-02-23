/**
 * Integration test — error and validation test cases.
 */

export function getErrorAndValidationTests(
  endpoint: string,
  method: string = 'GET',
): string {
  return `
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
`;
}
