/**
 * Integration test endpoint test case generator
 */

import { getErrorAndValidationTests } from './integration-test-error-cases.js';

/**
 * Generate endpoint test cases
 */
export function getEndpointTests(
  endpoint: string,
  method: string = 'GET',
): string {
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

` + getErrorAndValidationTests(endpoint, method);
}
