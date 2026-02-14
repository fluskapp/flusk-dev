/** @generated —
 * Config validator shared types and constants
 */

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

export const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'NODE_ENV',
  'PORT',
  'LOG_LEVEL',
];

export function createEmptyResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}
