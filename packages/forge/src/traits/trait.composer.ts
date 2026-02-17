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

/** Merge a code section (repository or route) from all outputs */
function mergeSection(
  outputs: TraitOutput[],
  key: 'repository' | 'route',
  entityName: string,
): string {
  const sections = outputs.map((o) => o[key]);
  const imports = dedupeImports(sections.flatMap((s) => s.imports));
  const types = sections.flatMap((s) => s.types).filter(Boolean).join('\n');
  const functions = sections.flatMap((s) => s.functions).filter(Boolean).join('\n\n');
  const traits = outputs.map((o) => o.traitName).join(', ');

  if (key === 'route') {
    return mergeRouteSection(imports, types, functions, entityName, traits);
  }

  return [
    `/** @generated from ${entityName} YAML — Traits: ${traits} */`,
    imports.join('\n'),
    types,
    functions,
  ].filter(Boolean).join('\n\n');
}

/** Merge route sections into a proper Fastify route registration function */
function mergeRouteSection(
  imports: string[],
  types: string,
  functions: string,
  entityName: string,
  traits: string,
): string {
  const camel = toCamelCase(toKebabCase(entityName));
  return [
    `/** @generated from ${entityName} YAML — Traits: ${traits} */`,
    imports.join('\n'),
    types,
    '',
    `/**`,
    ` * Register ${entityName} routes`,
    ` */`,
    `export async function ${camel}Routes(`,
    `  fastify: FastifyInstance,`,
    `): Promise<void> {`,
    functions,
    `}`,
  ].filter((line) => line !== undefined).join('\n');
}

/** Merge migration SQL from all outputs */
function mergeMigration(outputs: TraitOutput[]): string {
  const allSql = outputs.flatMap((o) => o.migration.sql);
  return allSql.join('\n');
}

/** Deduplicate import lines, merging named imports from the same module */
function dedupeImports(imports: string[]): string[] {
  const moduleMap = new Map<string, Set<string>>();
  const nonStandard: string[] = [];

  for (const imp of imports) {
    // Match: import type? { ... } from '...';
    const match = imp.match(
      /^import\s+(type\s+)?{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
    );
    if (match) {
      const prefix = match[1] ?? '';
      const names = match[2].split(',').map((s) => s.trim()).filter(Boolean);
      const mod = `${prefix.trim()}|${match[3]}`;
      if (!moduleMap.has(mod)) moduleMap.set(mod, new Set());
      for (const n of names) moduleMap.get(mod)!.add(n);
    } else {
      nonStandard.push(imp);
    }
  }

  const merged: string[] = [];
  for (const [mod, names] of moduleMap) {
    const [prefix, path] = mod.split('|');
    const keyword = prefix ? `import type` : `import`;
    merged.push(`${keyword} { ${[...names].join(', ')} } from '${path}';`);
  }

  return [...merged, ...new Set(nonStandard)];
}
