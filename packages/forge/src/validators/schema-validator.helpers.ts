/**
 * Schema validation helpers
 * Content validation and syntax error detection for TypeBox schemas
 */

import type { ValidationResult } from './config-validator.types.js';
import { createEmptyResult } from './config-validator.types.js';
import { VALID_TYPEBOX_TYPES, RESERVED_KEYWORDS } from './schema-validator.constants.js';
import { detectSyntaxErrors } from './schema-syntax-detector.js';

/**
 * Validate schema content
 */
export function validateSchemaContent(content: string, file: string): ValidationResult {
  const result = createEmptyResult();

  if (!content.includes('@sinclair/typebox')) {
    result.valid = false;
    result.errors.push({
      file,
      message: 'Missing TypeBox import',
      fix: 'Add: import { Type } from "@sinclair/typebox";',
    });
  }

  const hasExport = /export\s+const\s+\w+Schema\s*=/g.test(content);
  if (!hasExport) {
    result.valid = false;
    result.errors.push({
      file,
      message: 'Missing schema export',
      fix: 'Add: export const EntityNameSchema = Type.Object({...});',
    });
  }

  const typeMatches = content.matchAll(/Type\.(\w+)/g);
  for (const match of typeMatches) {
    const typeUsed = match[1];
    if (!VALID_TYPEBOX_TYPES.includes(typeUsed)) {
      result.valid = false;
      result.errors.push({
        file,
        message: `Invalid TypeBox type: Type.${typeUsed}`,
        fix: `Valid types: ${VALID_TYPEBOX_TYPES.join(', ')}`,
      });
    }
  }

  const syntaxErrors = detectSyntaxErrors(content, file);
  if (syntaxErrors.length > 0) {
    result.valid = false;
    result.errors.push(...syntaxErrors);
  }

  const fieldMatches = content.matchAll(/(\w+):\s*Type\./g);
  for (const match of fieldMatches) {
    const fieldName = match[1];
    if (RESERVED_KEYWORDS.includes(fieldName)) {
      result.valid = false;
      result.errors.push({
        file,
        message: `Field name "${fieldName}" is a reserved keyword`,
        fix: `Rename field to "${fieldName}_field" or use a different name`,
      });
    }
  }

  if (!content.includes('type ') || !content.includes('Static<typeof')) {
    result.warnings.push({ file, message: 'Missing TypeScript type export' });
  }

  return result;
}
