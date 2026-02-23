/**
 * Unit Test Template Generator
 * Generates comprehensive unit test files for services, utilities,
 * and business logic
 */

import { generateFunctionTests } from './unit-test-functions.js';
import { generateClassTests } from './unit-test-classes.js';

export interface UnitTestTemplateOptions {
  fileName: string;
  importPath: string;
  functions: string[];
  classes: string[];
}

export function generateUnitTestTemplate(
  options: UnitTestTemplateOptions,
): string {
  const { fileName, importPath, functions, classes } = options;

  const functionTests = generateFunctionTests(functions);
  const classTests = generateClassTests(classes);

  return `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ${[...functions, ...classes].join(', ')} } from '${importPath}';

/**
 * Unit Tests for ${fileName}
 *
 * These tests verify the business logic and behavior of functions
 * and classes in ${fileName} in isolation from external dependencies.
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
