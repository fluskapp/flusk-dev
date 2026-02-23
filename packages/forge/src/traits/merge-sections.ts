/**
 * Section merging utilities for trait composition.
 *
 * WHY: Merges repository, route, and migration sections
 * from multiple trait outputs into final file content.
 */

import type { TraitOutput } from './trait.types.js';
import { toCamelCase, toKebabCase } from '../generators/utils.js';
import { dedupeImports } from './dedupe-imports.js';

/** Merge a code section (repository or route) from all outputs */
export function mergeSection(
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
export function mergeMigration(outputs: TraitOutput[]): string {
  const allSql = outputs.flatMap((o) => o.migration.sql);
  return allSql.join('\n');
}
