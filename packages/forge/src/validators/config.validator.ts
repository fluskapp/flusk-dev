/**
 * Config validator - validates configuration files
 */

export type { ValidationResult, ValidationError, ValidationWarning } from './config-validator.types.js';

import type { ValidationResult } from './config-validator.types.js';
import { validatePackageJson, validateEnvExample } from './config-validator.package.js';
import { validateDockerCompose, validateWattJson } from './config-validator.infra.js';

/**
 * Validate all configuration files
 */
export async function validateConfig(projectRoot: string = process.cwd()): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const packageJsonResult = validatePackageJson(projectRoot);
  result.errors.push(...packageJsonResult.errors);
  result.warnings.push(...packageJsonResult.warnings);
  if (!packageJsonResult.valid) result.valid = false;

  const envResult = validateEnvExample(projectRoot);
  result.errors.push(...envResult.errors);
  result.warnings.push(...envResult.warnings);
  if (!envResult.valid) result.valid = false;

  const dockerResult = validateDockerCompose(projectRoot);
  result.errors.push(...dockerResult.errors);
  result.warnings.push(...dockerResult.warnings);
  if (!dockerResult.valid) result.valid = false;

  const wattResult = validateWattJson(projectRoot);
  result.errors.push(...wattResult.errors);
  result.warnings.push(...wattResult.warnings);
  if (!wattResult.valid) result.valid = false;

  return result;
}
