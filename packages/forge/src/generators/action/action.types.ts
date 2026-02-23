/**
 * Types for the action generator.
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

export interface ActionInput {
  name: string;
  description: string;
  required?: boolean;
  default?: string;
}

export interface ActionOutput {
  name: string;
  description: string;
}

export interface ActionSchema {
  name: string;
  description: string;
  inputs: ActionInput[];
  outputs: ActionOutput[];
}

export interface GenResult {
  files: { path: string; action: 'created' }[];
}

export async function loadSchema(yamlPath: string): Promise<ActionSchema> {
  return parseYaml(await readFile(yamlPath, 'utf-8')) as ActionSchema;
}
