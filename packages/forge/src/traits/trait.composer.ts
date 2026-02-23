/**
 * Trait composition engine — merges multiple trait outputs into files.
 *
 * WHY: Each trait produces code sections independently. The composer
 * deduplicates imports, concatenates functions, and produces final
 * file content with proper headers and custom sections preserved.
 */

import { createLogger } from '@flusk/logger';
import type { TraitContext, TraitOutput } from './trait.types.js';
import { resolveTraitChain } from './trait.registry.js';
import type { EntitySchema, StorageTarget } from '../schema/index.js';
import { toKebabCase, toSnakeCase, toTableName } from '../generators/utils.js';
import { toCamelCase } from '../generators/utils.js';
import { mergeSection, mergeMigration } from './merge-sections.js';

const logger = createLogger({ name: 'traits:composer' });

/** Merged output from all traits for one entity */
export interface ComposedOutput {
  repository: string;
  route: string;
  migration: string;
  traitNames: string[];
}

/** Build a TraitContext from schema and storage target */
export function buildContext(
  schema: EntitySchema,
  storageTarget: StorageTarget,
): TraitContext {
  const kebabName = toKebabCase(schema.name);
  return {
    schema,
    storageTarget,
    tableName: toTableName(toSnakeCase(schema.name)),
    kebabName,
    camelName: toCamelCase(kebabName),
  };
}

/**
 * Compose traits for an entity: resolve chain, generate, merge.
 * Returns merged file contents for repository, routes, migration.
 */
export function composeTraits(
  schema: EntitySchema,
  storageTarget: StorageTarget,
): ComposedOutput {
  const caps = Object.entries(schema.capabilities ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  const traits = resolveTraitChain(caps);
  const ctx = buildContext(schema, storageTarget);

  logger.info({ entity: schema.name, traits: caps }, 'Composing traits');
  const outputs = traits.map((t) => t.generate(ctx));

  return {
    repository: mergeSection(outputs, 'repository', schema.name),
    route: mergeSection(outputs, 'route', schema.name),
    migration: mergeMigration(outputs),
    traitNames: traits.map((t) => t.name),
  };
}
