/**
 * Integration test endpoint test case generator
 */

/**
 * Generate endpoint test cases
 */
export function getEndpointTests(endpoint: string, method: string = 'GET'): string {
  return `
  describe('${method} ${endpoint}', () => {
    it('should return 200 for valid request', async () => {
      // Arrange
      const payload = {};

      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toBeDefined();
    });

    it('should return 400 for invalid request', async () => {
      // Arrange
      const invalidPayload = { invalid: true };

      // Act
      const response = await app.inject({
        method: '${method}',
        url: '${endpoint}',
        payload: invalidPayload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });

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
