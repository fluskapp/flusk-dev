/**
 * Package.json validator
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationResult } from './config-validator.types.js';
import { createEmptyResult } from './config-validator.types.js';

/**
 * Validate package.json
 */
export function validatePackageJson(projectRoot: string): ValidationResult {
  const result = createEmptyResult();
  const packageJsonPath = resolve(projectRoot, 'package.json');

  if (!existsSync(packageJsonPath)) {
    result.valid = false;
    result.errors.push({
      file: 'package.json',
      message: 'package.json not found',
      fix: 'Run: npm init or flusk init',
    });
    return result;
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    if (!pkg.name) {
      result.valid = false;
      result.errors.push({
        file: 'package.json',
        message: 'Missing "name" field',
        fix: 'Add "name": "your-project-name"',
      });
    }

    if (!pkg.version) {
      result.warnings.push({
        file: 'package.json',
        message: 'Missing "version" field',
      });
    }

    if (!pkg.type || pkg.type !== 'module') {
      result.valid = false;
      result.errors.push({
        file: 'package.json',
        message: 'Missing or incorrect "type" field',
        fix: 'Add "type": "module" for ESM support',
      });
    }

    if (!pkg.workspaces && !existsSync(resolve(projectRoot, 'pnpm-workspace.yaml'))) {
      result.warnings.push({
        file: 'package.json',
        message: 'No workspace configuration found',
      });
    }

    const recommendedScripts = ['dev', 'build', 'test', 'start'];
    for (const script of recommendedScripts) {
      if (!pkg.scripts?.[script]) {
        result.warnings.push({
          file: 'package.json',
          message: `Missing recommended script: "${script}"`,
        });
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      file: 'package.json',
      message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      fix: 'Fix JSON syntax errors',
    });
  }

  return result;
}
