/**
 * Watt.json config validator
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationResult } from './config-validator.types.js';
import { createEmptyResult } from './config-validator.types.js';

/**
 * Validate watt.json
 */
export function validateWattJson(projectRoot: string): ValidationResult {
  const result = createEmptyResult();
  const wattJsonPath = resolve(projectRoot, 'watt.json');

  if (!existsSync(wattJsonPath)) {
    result.warnings.push({
      file: 'watt.json',
      message: 'watt.json not found',
    });
    return result;
  }

  try {
    const content = readFileSync(wattJsonPath, 'utf-8');
    const wattConfig = JSON.parse(content);

    if (!wattConfig.$schema) {
      result.warnings.push({
        file: 'watt.json',
        message: 'Missing $schema field',
      });
    }

    if (!wattConfig.entrypoint) {
      result.valid = false;
      result.errors.push({
        file: 'watt.json',
        message: 'Missing entrypoint field',
        fix: 'Add "entrypoint": "service-name"',
      });
    }

    if (!Array.isArray(wattConfig.services)) {
      result.valid = false;
      result.errors.push({
        file: 'watt.json',
        message: 'Missing or invalid services array',
        fix: 'Add "services": [{...}]',
      });
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      file: 'watt.json',
      message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      fix: 'Fix JSON syntax errors',
    });
  }

  return result;
}
