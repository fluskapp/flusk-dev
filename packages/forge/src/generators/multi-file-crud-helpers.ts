/**
 * Helper utilities for multi-file CRUD generation.
 */

import type { FieldSchema } from '../schema/field-schema.types.js';
import { toSnakeCase } from './utils.js';

export function toSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

export function tbl(name: string): string {
  return toSnakeCase(name).replace(/-/g, '_') + 's';
}

/**
 * Convert PascalCase entity name to a human-readable label.
 * Preserves acronyms: "LLMCall" → "LLM call"
 */
export function entityLabel(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^(\S+)\s/, (_, first) => {
      return first + ' ';
    })
    .replace(/\s(\S)/g, (_, c) => ' ' + c.toLowerCase())
    .trim();
}

export function isJson(f: FieldSchema): boolean {
  return f.type === 'json' || f.type === 'array';
}

export function isBool(f: FieldSchema): boolean {
  return f.type === 'boolean';
}

export function isDate(f: FieldSchema): boolean {
  return f.type === 'date';
}

/** Infer a TypeScript type alias for a JSON field */
export function jsonTypeAlias(name: string, _field: FieldSchema): string | undefined {
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  if (name === 'tokens') return 'TokenUsage';
  if (name === 'metadata') return 'Metadata';
  return pascal;
}
