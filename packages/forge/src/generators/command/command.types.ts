/**
 * Types for the command generator.
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

export interface CommandOption {
  name: string;
  type: 'string' | 'integer' | 'number' | 'boolean';
  default?: string | number | boolean;
  enum?: string[];
  required?: boolean;
  description?: string;
}

export interface CommandSchema {
  name: string;
  description: string;
  options: CommandOption[];
}

export interface GenResult {
  files: { path: string; action: 'created' }[];
}

export async function loadSchema(yamlPath: string): Promise<CommandSchema> {
  return parseYaml(await readFile(yamlPath, 'utf-8')) as CommandSchema;
}
