/** @generated —
 * Test content generation based on file analysis
 */

import { generateUnitTestTemplate } from '../templates/test/unit-test.template.js';
import { generateIntegrationTestTemplate } from '../templates/test/integration-test.template.js';
import { generateRepositoryTestTemplate } from '../templates/test/repository-test.template.js';
import type { FileAnalysis } from './test-generator.helpers.js';

/**
 * Generate test file content based on analysis
 */
export function generateTestContent(
  analysis: FileAnalysis,
  testType: 'unit' | 'integration' | 'repository',
  fileName: string,
  importPath: string
): string {
  switch (testType) {
    case 'repository': {
      const className = analysis.classes[0] || 'Repository';
      const entityName = className.replace(/Repository$/, '');
      return generateRepositoryTestTemplate({
        fileName,
        importPath,
        className,
        entityName,
      });
    }

    case 'integration': {
      return generateIntegrationTestTemplate({
        fileName,
        importPath,
        endpoint: analysis.endpoint,
        method: analysis.method,
        hasDatabase: analysis.hasDatabase,
        hasExternalApi: analysis.hasExternalApi,
      });
    }

    case 'unit':
    default: {
      return generateUnitTestTemplate({
        fileName,
        importPath,
        functions: analysis.functions,
        classes: analysis.classes,
      });
    }
  }
}
