/**
 * Schema validator - validates TypeBox entity schemas
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationResult } from './config-validator.types.js';
import { validateSchemaContent } from './schema-validator.helpers.js';

export type { ValidationResult, ValidationError, ValidationWarning } from './config-validator.types.js';

/**
 * Validate all entity schemas in the project
 */
export async function validateSchemas(projectRoot: string = process.cwd()): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const entitiesDir = resolve(projectRoot, 'packages/entities/src');

  // Check if entities directory exists
  if (!existsSync(entitiesDir)) {
    result.valid = false;
    result.errors.push({
      file: 'packages/entities/src',
      message: 'Entities directory not found',
      fix: 'Create the directory: mkdir -p packages/entities/src',
    });
    return result;
  }

  // Find all entity files
  const files = readdirSync(entitiesDir)
    .filter(f => f.endsWith('.entity.ts') && f !== 'base.entity.ts');

  if (files.length === 0) {
    result.warnings.push({
      file: entitiesDir,
      message: 'No entity files found',
    });
    return result;
  }

  // Validate each entity file
  for (const file of files) {
    const filePath = resolve(entitiesDir, file);

    if (!existsSync(filePath)) {
      result.valid = false;
      result.errors.push({
        file,
        message: 'Entity file not found',
      });
      continue;
    }

    // Read and validate file content
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileResult = validateSchemaContent(content, file);

      result.errors.push(...fileResult.errors);
      result.warnings.push(...fileResult.warnings);

      if (!fileResult.valid) {
        result.valid = false;
      }
    } catch (error) {
      result.valid = false;
      result.errors.push({
        file,
        message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return result;
}
