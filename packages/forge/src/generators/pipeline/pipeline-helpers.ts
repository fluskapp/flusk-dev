/**
 * Helpers for the pipeline generator.
 */

import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { PipelineSchema } from './pipeline.types.js';

export function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function toPascal(s: string): string {
  return s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

/** Load a pipeline YAML */
export async function loadPipelineSchema(
  yamlPath: string,
): Promise<PipelineSchema> {
  const raw = await readFile(yamlPath, 'utf-8');
  return parse(raw) as PipelineSchema;
}

/** Resolve $variable references in step args/exprs */
export function resolveRef(val: unknown): string {
  if (typeof val !== 'string') return JSON.stringify(val);
  const s = val.trim();
  if (s.startsWith('$')) {
    return s.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, (_, ref) => ref);
  }
  if (/[()[\]{}<>+\-*/%=!&|?:,.]/.test(s) || s.startsWith('[') || s.startsWith('{')) {
    return s.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, (_, ref) => ref);
  }
  return `'${s}'`;
}

/** Map complex types to any for generated code (no external imports) */
export function safeType(t: string): string {
  if (/^(string|number|boolean|void|null|undefined|unknown|any)$/.test(t)) return t;
  if (/^Record</.test(t)) return t;
  if (/\[]$/.test(t)) return t;
  if (/^[A-Z]/.test(t)) return t; // PascalCase = entity/type reference
  return 'any';
}

/** Extract type imports needed from input/output type refs */
export function extractTypeImports(
  input: Record<string, { type: string }>,
): string[] {
  const types = new Set<string>();
  for (const v of Object.values(input)) {
    const match = v.type.match(/^([A-Z][A-Za-z]+)/);
    if (match && match[1] !== 'Record') types.add(match[1]);
  }
  if (types.size === 0) return [];
  // Entity types come from @flusk/entities, others from @flusk/types
  const entityTypes = [...types].filter(t => t.endsWith('Entity'));
  const otherTypes = [...types].filter(t => !t.endsWith('Entity'));
  const imports: string[] = [];
  if (entityTypes.length) {
    imports.push(`import type { ${entityTypes.join(', ')} } from '@flusk/entities';`);
  }
  if (otherTypes.length) {
    imports.push(`import type { ${otherTypes.join(', ')} } from '@flusk/types';`);
  }
  return imports;
}
