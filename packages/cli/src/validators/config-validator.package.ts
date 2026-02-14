/**
 * Package.json and .env.example validators
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationResult } from './config-validator.types.js';
import { REQUIRED_ENV_VARS, createEmptyResult } from './config-validator.types.js';

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

/**
 * Validate .env.example
 */
export function validateEnvExample(projectRoot: string): ValidationResult {
  const result = createEmptyResult();
  const envExamplePath = resolve(projectRoot, '.env.example');

  if (!existsSync(envExamplePath)) {
    result.warnings.push({
      file: '.env.example',
      message: '.env.example not found',
    });
    return result;
  }

  try {
    const content = readFileSync(envExamplePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    const definedVars = lines.map(line => {
      const match = line.match(/^([^=]+)=/);
      return match ? match[1].trim() : null;
    }).filter(Boolean);

    for (const envVar of REQUIRED_ENV_VARS) {
      if (!definedVars.includes(envVar)) {
        result.valid = false;
        result.errors.push({
          file: '.env.example',
          message: `Missing required environment variable: ${envVar}`,
          fix: `Add ${envVar}=<value> to .env.example`,
        });
      }
    }

    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (value && !value.startsWith('<') && !value.startsWith('your-') && key !== 'NODE_ENV') {
          result.warnings.push({
            file: '.env.example',
            message: `Possible actual value in .env.example: ${key}`,
          });
        }
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      file: '.env.example',
      message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return result;
}
