/**
 * Validate fields, queries, and relations within an entity YAML.
 */

import type { YamlValidationResult } from './yaml-schema.types.js';
import { VALID_FIELD_TYPES, VALID_RETURN_TYPES } from './yaml-schema.types.js';

/** Validate all fields in an entity */
export function validateFields(
  file: string,
  fields: Record<string, Record<string, unknown>>,
  result: YamlValidationResult,
): void {
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (!fieldDef || typeof fieldDef !== 'object') {
      result.valid = false;
      result.issues.push({
        file,
        message: `Field "${fieldName}" must be an object with at least a type`,
        severity: 'error',
      });
      continue;
    }

    if (!fieldDef.type || typeof fieldDef.type !== 'string') {
      result.valid = false;
      result.issues.push({
        file,
        message: `Field "${fieldName}" missing required property: type`,
        severity: 'error',
      });
    } else if (!VALID_FIELD_TYPES.has(fieldDef.type)) {
      result.valid = false;
      result.issues.push({
        file,
        message: `Field "${fieldName}" has invalid type: "${fieldDef.type}"`,
        severity: 'error',
        fix: `Valid types: ${[...VALID_FIELD_TYPES].join(', ')}`,
      });
    }

    if (!fieldDef.description) {
      result.issues.push({
        file,
        message: `Field "${fieldName}" missing description`,
        severity: 'warning',
      });
    }
  }
}

/** Validate queries if present */
export function validateQueries(
  file: string,
  queries: Record<string, Record<string, unknown>>,
  result: YamlValidationResult,
): void {
  for (const [queryName, queryDef] of Object.entries(queries)) {
    if (!queryDef || typeof queryDef !== 'object') continue;

    if (queryDef.returns && typeof queryDef.returns === 'string') {
      if (!VALID_RETURN_TYPES.has(queryDef.returns)) {
        result.valid = false;
        result.issues.push({
          file,
          message: `Query "${queryName}" has invalid return type: "${queryDef.returns}"`,
          severity: 'error',
          fix: `Valid return types: ${[...VALID_RETURN_TYPES].join(', ')}`,
        });
      }
    }
  }
}

/** Validate relations if present */
export function validateRelations(
  file: string,
  relations: Record<string, Record<string, unknown>>,
  allEntityNames: Set<string>,
  result: YamlValidationResult,
): void {
  for (const [relName, relDef] of Object.entries(relations)) {
    if (!relDef || typeof relDef !== 'object') continue;

    const target = relDef.entity || relDef.target;
    if (target && typeof target === 'string' && !allEntityNames.has(target)) {
      result.valid = false;
      result.issues.push({
        file,
        message: `Relation "${relName}" references unknown entity: "${target}"`,
        severity: 'error',
        fix: `Known entities: ${[...allEntityNames].join(', ')}`,
      });
    }
  }
}
