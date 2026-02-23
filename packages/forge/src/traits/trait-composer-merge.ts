/**
 * Section merging and import deduplication for trait composition.
 */

import type { TraitOutput } from './trait.types.js';
import { toKebabCase } from '../generators/utils.js';
import { toCamelCase } from '../generators/utils.js';

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
    `// --- BEGIN GENERATED (do not edit) ---`,
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
    `// --- END GENERATED ---`,
  ].filter((line) => line !== undefined).join('\n');
}

/** Merge migration SQL from all outputs */
export function mergeMigration(outputs: TraitOutput[]): string {
  const allSql = outputs.flatMap((o) => o.migration.sql);
  return allSql.join('\n');
}

/** Deduplicate import lines, merging named imports from the same module */
export function dedupeImports(imports: string[]): string[] {
  const moduleMap = new Map<string, Set<string>>();
  const nonStandard: string[] = [];

  for (const imp of imports) {
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
