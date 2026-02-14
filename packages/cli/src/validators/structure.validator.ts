/** @generated —
 * Structure validator - validates project structure and file organization
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

const REQUIRED_DIRECTORIES = [
  'packages',
  'packages/entities',
  'packages/entities/src',
  'packages/types',
  'packages/types/src',
  'packages/resources',
  'packages/resources/src',
  'packages/business-logic',
  'packages/business-logic/src',
  'packages/execution',
  'packages/execution/src',
];

const REQUIRED_FILES = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.json',
];

const RECOMMENDED_FILES = [
  '.gitignore',
  'docker-compose.yml',
  '.env.example',
  'README.md',
  'CLAUDE.md',
];

/**
 * Validate project structure
 */
export async function validateStructure(projectRoot: string = process.cwd()): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check required directories
  for (const dir of REQUIRED_DIRECTORIES) {
    const dirPath = resolve(projectRoot, dir);
    if (!existsSync(dirPath)) {
      result.valid = false;
      result.errors.push({
        file: dir,
        message: 'Required directory not found',
        fix: `Create directory: mkdir -p ${dir}`,
      });
    }
  }

  // Check required files
  for (const file of REQUIRED_FILES) {
    const filePath = resolve(projectRoot, file);
    if (!existsSync(filePath)) {
      result.valid = false;
      result.errors.push({
        file,
        message: 'Required file not found',
        fix: `File "${file}" is required for Flusk projects`,
      });
    }
  }

  // Check recommended files
  for (const file of RECOMMENDED_FILES) {
    const filePath = resolve(projectRoot, file);
    if (!existsSync(filePath)) {
      result.warnings.push({
        file,
        message: 'Recommended file not found',
      });
    }
  }

  // Validate package structure
  const packages = ['entities', 'types', 'resources', 'business-logic', 'execution'];
  for (const pkg of packages) {
    const pkgPath = resolve(projectRoot, 'packages', pkg);
    const pkgJsonPath = resolve(pkgPath, 'package.json');
    const srcPath = resolve(pkgPath, 'src');

    if (existsSync(pkgPath)) {
      if (!existsSync(pkgJsonPath)) {
        result.valid = false;
        result.errors.push({
          file: `packages/${pkg}/package.json`,
          message: 'Package missing package.json',
          fix: `Create package.json in packages/${pkg}/`,
        });
      }

      if (!existsSync(srcPath)) {
        result.valid = false;
        result.errors.push({
          file: `packages/${pkg}/src`,
          message: 'Package missing src directory',
          fix: `Create src directory: mkdir -p packages/${pkg}/src`,
        });
      }
    }
  }

  // Check for common anti-patterns
  const antiPatterns = checkAntiPatterns(projectRoot);
  result.warnings.push(...antiPatterns);

  return result;
}

/**
 * Check for common anti-patterns
 */
function checkAntiPatterns(projectRoot: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check for unnecessary files in root
  const rootFiles = ['.DS_Store', 'Thumbs.db', 'desktop.ini'];
  for (const file of rootFiles) {
    const filePath = resolve(projectRoot, file);
    if (existsSync(filePath)) {
      warnings.push({
        file,
        message: 'Unnecessary file in root directory',
      });
    }
  }

  // Check for .env file (should be .env.example)
  const envPath = resolve(projectRoot, '.env');
  if (existsSync(envPath)) {
    warnings.push({
      file: '.env',
      message: '.env file should not be committed to version control',
    });
  }

  // Check for node_modules in root (should be hoisted by pnpm)
  const nodeModulesPath = resolve(projectRoot, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    warnings.push({
      file: 'node_modules',
      message: 'Dependencies not installed',
    });
  }

  return warnings;
}
