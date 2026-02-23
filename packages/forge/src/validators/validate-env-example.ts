/**
 * .env.example validator
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationResult } from './config-validator.types.js';
import { REQUIRED_ENV_VARS, createEmptyResult } from './config-validator.types.js';

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
    const lines = content.split('\n').filter(line =>
      line.trim() && !line.startsWith('#'));

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
        if (value && !value.startsWith('<') &&
            !value.startsWith('your-') && key !== 'NODE_ENV') {
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
