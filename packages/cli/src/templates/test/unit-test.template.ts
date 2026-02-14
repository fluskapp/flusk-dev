/** @generated —
 * Unit Test Template Generator
 * Generates comprehensive unit test files for services, utilities, and business logic
 */

export interface UnitTestTemplateOptions {
  fileName: string;
  importPath: string;
  functions: string[];
  classes: string[];
}

export function generateUnitTestTemplate(options: UnitTestTemplateOptions): string {
  const { fileName, importPath, functions, classes } = options;

  const functionTests = functions.map(fn => `
  describe('${fn}', () => {
    it('should execute successfully with valid input', () => {
      // Arrange
      const input = {};

      // Act
      const result = ${fn}(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle invalid input gracefully', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => ${fn}(invalidInput as any)).toThrow();
    });

    it('should return expected output format', () => {
      // Arrange
      const input = {};

      // Act
      const result = ${fn}(input);

      // Assert
      expect(result).toMatchObject({});
    });
  });
`).join('\n');

  const classTests = classes.map(cls => `
  describe('${cls}', () => {
    let instance: ${cls};

    beforeEach(() => {
      instance = new ${cls}();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should create instance successfully', () => {
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(${cls});
    });

    it('should execute main method successfully', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await instance.execute(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      await expect(instance.execute(invalidInput as any)).rejects.toThrow();
    });

    it('should validate input parameters', async () => {
      // Arrange
      const input = { invalid: true };

      // Act & Assert
      await expect(instance.execute(input)).rejects.toThrow();
    });

    it('should return expected output format', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await instance.execute(input);

      // Assert
      expect(result).toMatchObject({});
    });
  });
`).join('\n');

  return `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ${[...functions, ...classes].join(', ')} } from '${importPath}';

/**
 * Unit Tests for ${fileName}
 *
 * These tests verify the business logic and behavior of functions and classes
 * in ${fileName} in isolation from external dependencies.
 *
 * Test Coverage:
 * - Happy path scenarios
 * - Error handling
 * - Input validation
 * - Output format verification
 * - Edge cases and boundary conditions
 */

describe('${fileName}', () => {
${functionTests}
${classTests}
});
`;
}
