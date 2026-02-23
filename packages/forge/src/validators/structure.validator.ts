/**
 * Structure validator - validates project structure and file organization
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  REQUIRED_DIRECTORIES,
  REQUIRED_FILES,
  RECOMMENDED_FILES,
  PACKAGE_NAMES,
} from './structure-validator-constants.js';
import { checkAntiPatterns } from './structure-validator-antipatterns.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  message: string;
  fix?: string;
}

export interface ValidationWarning {
  file: string;
  message: string;
}

/**
 * Validate project structure
 */
export async function validateStructure(
  projectRoot: string = process.cwd(),
): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  for (const dir of REQUIRED_DIRECTORIES) {
    if (!existsSync(resolve(projectRoot, dir))) {
      result.valid = false;
      result.errors.push({
        file: dir,
        message: 'Required directory not found',
        fix: `Create directory: mkdir -p ${dir}`,
      });
    }
  }

  for (const file of REQUIRED_FILES) {
    if (!existsSync(resolve(projectRoot, file))) {
      result.valid = false;
      result.errors.push({
        file,
        message: 'Required file not found',
        fix: `File "${file}" is required for Flusk projects`,
      });
    }
  }

  for (const file of RECOMMENDED_FILES) {
    if (!existsSync(resolve(projectRoot, file))) {
      result.warnings.push({ file, message: 'Recommended file not found' });
    }
  }

  for (const pkg of PACKAGE_NAMES) {
    const pkgPath = resolve(projectRoot, 'packages', pkg);
    if (existsSync(pkgPath)) {
      if (!existsSync(resolve(pkgPath, 'package.json'))) {
        result.valid = false;
        result.errors.push({
          file: `packages/${pkg}/package.json`,
          message: 'Package missing package.json',
          fix: `Create package.json in packages/${pkg}/`,
        });
      }
      if (!existsSync(resolve(pkgPath, 'src'))) {
        result.valid = false;
        result.errors.push({
          file: `packages/${pkg}/src`,
          message: 'Package missing src directory',
          fix: `Create src directory: mkdir -p packages/${pkg}/src`,
        });
      }
    }
  }

  result.warnings.push(...checkAntiPatterns(projectRoot));
  return result;
}
