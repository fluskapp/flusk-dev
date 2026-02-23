/**
 * Types and constants for YAML entity schema validation.
 */

/** Validation issue */
export interface YamlValidationIssue {
  file: string;
  message: string;
  severity: 'error' | 'warning';
  fix?: string;
}

/** Full validation result */
export interface YamlValidationResult {
  valid: boolean;
  issues: YamlValidationIssue[];
}

/** Valid TypeBox type names that map to YAML field types */
export const VALID_FIELD_TYPES = new Set([
  'string', 'number', 'boolean', 'integer',
  'json', 'date', 'datetime', 'timestamp',
  'uuid', 'enum', 'array', 'object', 'optional',
]);

/** Valid query return types */
export const VALID_RETURN_TYPES = new Set(['single', 'list', 'scalar', 'raw']);
