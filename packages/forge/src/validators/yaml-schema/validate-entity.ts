/**
 * Validate a single entity YAML definition.
 */

import type { YamlValidationResult } from './yaml-schema.types.js';
import { validateFields, validateQueries, validateRelations } from './validate-entity-fields.js';

/** Validate a single entity definition */
export function validateEntity(
  file: string,
  entity: Record<string, unknown>,
  allEntityNames: Set<string>,
  result: YamlValidationResult,
): void {
  if (!entity.name || typeof entity.name !== 'string') {
    result.valid = false;
    result.issues.push({
      file,
      message: 'Missing required field: name',
      severity: 'error',
      fix: 'Add: name: MyEntityName',
    });
  }

  if (!entity.description || typeof entity.description !== 'string') {
    result.valid = false;
    result.issues.push({
      file,
      message: 'Missing required field: description',
      severity: 'error',
      fix: 'Add: description: "What this entity represents"',
    });
  }

  if (!entity.fields || typeof entity.fields !== 'object') {
    result.valid = false;
    result.issues.push({
      file,
      message: 'Missing required field: fields',
      severity: 'error',
      fix: 'Add fields: block with at least one field definition',
    });
    return;
  }

  const fields = entity.fields as Record<string, Record<string, unknown>>;
  validateFields(file, fields, result);

  if (entity.queries && typeof entity.queries === 'object') {
    validateQueries(file, entity.queries as Record<string, Record<string, unknown>>, result);
  }

  if (entity.relations && typeof entity.relations === 'object') {
    validateRelations(
      file,
      entity.relations as Record<string, Record<string, unknown>>,
      allEntityNames,
      result,
    );
  }
}
