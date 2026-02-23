/**
 * YAML entity schema validator — ensures entity YAMLs follow the required format.
 */

import { resolve } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { YamlValidationResult } from './yaml-schema/yaml-schema.types.js';
import { validateEntity } from './yaml-schema/validate-entity.js';

export type { YamlValidationIssue, YamlValidationResult } from './yaml-schema/yaml-schema.types.js';

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

  for (const [file, entity] of parsedEntities) {
    validateEntity(file, entity, entityNames, result);
  }

  return result;
}
