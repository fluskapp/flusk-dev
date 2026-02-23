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
  if (/^Record</.test(t)) return t.replace(/[A-Z][A-Za-z]+(?=[>\],\s}])/g, 'any');
  if (/\[]$/.test(t)) return 'any[]';
  return 'any';
}
