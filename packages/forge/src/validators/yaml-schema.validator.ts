/**
 * YAML entity schema validator — ensures entity YAMLs follow the required format.
 *
 * WHY: Catch invalid YAML definitions before running generators,
 * preventing broken generated code downstream.
 */

import { resolve } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

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
const VALID_FIELD_TYPES = new Set([
  'string', 'number', 'boolean', 'integer',
  'json', 'date', 'datetime', 'timestamp',
  'uuid', 'enum', 'array', 'object', 'optional',
]);

/** Valid query return types */
const VALID_RETURN_TYPES = new Set(['single', 'list', 'scalar', 'raw']);

/**
 * Validate all entity YAML files in the schema directory.
 */
export function validateEntityYamls(
  projectRoot: string = process.cwd(),
): YamlValidationResult {
  const result: YamlValidationResult = { valid: true, issues: [] };
  const entitiesDir = resolve(projectRoot, 'packages/schema/entities');

  if (!existsSync(entitiesDir)) {
    result.valid = false;
    result.issues.push({
      file: 'packages/schema/entities',
      message: 'Entity YAML directory not found',
      severity: 'error',
      fix: 'Create the directory: mkdir -p packages/schema/entities',
    });
    return result;
  }

  const yamlFiles = readdirSync(entitiesDir)
    .filter((f) => f.endsWith('.entity.yaml'));

  if (yamlFiles.length === 0) {
    result.issues.push({
      file: entitiesDir,
      message: 'No entity YAML files found',
      severity: 'warning',
    });
    return result;
  }

  // Collect all entity names for relation validation
  const entityNames = new Set<string>();
  const parsedEntities: Map<string, Record<string, unknown>> = new Map();

  for (const file of yamlFiles) {
    const filePath = resolve(entitiesDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseYaml(content) as Record<string, unknown>;
      if (parsed && typeof parsed.name === 'string') {
        entityNames.add(parsed.name);
      }
      parsedEntities.set(file, parsed);
    } catch (e) {
      result.valid = false;
      result.issues.push({
        file,
        message: `Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`,
        severity: 'error',
      });
    }
  }

  // Validate each entity
  for (const [file, entity] of parsedEntities) {
    validateEntity(file, entity, entityNames, result);
  }

  return result;
}

/** Validate a single entity definition */
function validateEntity(
  file: string,
  entity: Record<string, unknown>,
  allEntityNames: Set<string>,
  result: YamlValidationResult,
): void {
  // Required: name
  if (!entity.name || typeof entity.name !== 'string') {
    result.valid = false;
    result.issues.push({
      file,
      message: 'Missing required field: name',
      severity: 'error',
      fix: 'Add: name: MyEntityName',
    });
  }

  // Required: description
  if (!entity.description || typeof entity.description !== 'string') {
    result.valid = false;
    result.issues.push({
      file,
      message: 'Missing required field: description',
      severity: 'error',
      fix: 'Add: description: "What this entity represents"',
    });
  }

  // Required: fields
  if (!entity.fields || typeof entity.fields !== 'object') {
    result.valid = false;
    result.issues.push({
      file,
      message: 'Missing required field: fields',
      severity: 'error',
      fix: 'Add fields: block with at least one field definition',
    });
    return; // Can't validate further without fields
  }

  // Validate each field
  const fields = entity.fields as Record<string, Record<string, unknown>>;
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

    // Field must have type
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

    // Field should have description
    if (!fieldDef.description) {
      result.issues.push({
        file,
        message: `Field "${fieldName}" missing description`,
        severity: 'warning',
      });
    }
  }

  // Validate queries if present
  if (entity.queries && typeof entity.queries === 'object') {
    const queries = entity.queries as Record<string, Record<string, unknown>>;
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

  // Validate relations if present
  if (entity.relations && typeof entity.relations === 'object') {
    const relations = entity.relations as Record<string, Record<string, unknown>>;
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
}
