/**
 * Entity schema registry — loads all YAMLs and provides lookup.
 *
 * WHY: The registry is the runtime catalog of all entities.
 * Generators query it by name, get dependency-ordered lists,
 * and it auto-builds _registry.yaml for human reference.
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { createLogger } from '@flusk/logger';
import { parseEntitySchema } from './entity-schema.parser.js';
import { validateEntitySchemas } from './entity-schema.validator.js';
import { buildDependencyGraph } from './dependency-graph.js';
import { topologicalSort } from './topological-sort.js';
import type { EntitySchema } from './entity-schema.types.js';

const logger = createLogger({ name: 'schema:registry' });

/** In-memory entity registry */
export interface EntityRegistry {
  schemas: Map<string, EntitySchema>;
  ordered: string[];
}

/**
 * Load all entity YAML files from a directory.
 * Validates, builds dependency order, writes _registry.yaml.
 */
export function loadEntityRegistry(entitiesDir: string): EntityRegistry {
  logger.info({ dir: entitiesDir }, 'Loading entity registry');
  const files = readdirSync(entitiesDir)
    .filter((f) => f.endsWith('.entity.yaml'))
    .sort();

  const schemas: EntitySchema[] = [];
  for (const file of files) {
    const schema = parseEntitySchema(join(entitiesDir, file));
    schemas.push(schema);
  }

  const errors = validateEntitySchemas(schemas);
  if (errors.length > 0) {
    const msg = errors.map((e) => `${e.path}: ${e.message}`).join('\n');
    throw new Error(`Registry validation failed:\n${msg}`);
  }

  const graph = buildDependencyGraph(schemas);
  const ordered = topologicalSort(graph);
  const registry = buildRegistry(schemas, ordered);

  writeRegistryFile(entitiesDir, registry);
  logger.info({ count: schemas.length }, 'Registry loaded');
  return registry;
}

/** Build the in-memory registry from schemas */
function buildRegistry(
  schemas: EntitySchema[],
  ordered: string[],
): EntityRegistry {
  const map = new Map<string, EntitySchema>();
  for (const s of schemas) map.set(s.name, s);
  return { schemas: map, ordered };
}

/** Write _registry.yaml for human reference */
function writeRegistryFile(dir: string, reg: EntityRegistry): void {
  const data = {
    entities: reg.ordered,
    count: reg.schemas.size,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(dir, '_registry.yaml'), stringify(data), 'utf-8');
  logger.debug('Wrote _registry.yaml');
}
