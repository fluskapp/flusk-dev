/** @generated —
 * YAML file reader — loads and parses a single entity YAML.
 *
 * WHY: Separated from validation so we can report parse errors
 * (bad YAML syntax) distinctly from schema errors (wrong shape).
 */

import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { createLogger } from '@flusk/logger';

const logger = createLogger({ name: 'schema:parse' });

/** Error thrown when YAML parsing fails */
export class YamlParseError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly cause: unknown,
  ) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to parse ${filePath}: ${msg}`);
    this.name = 'YamlParseError';
  }
}

/**
 * Read and parse a YAML file, returning the raw object.
 * Throws YamlParseError with file path context on failure.
 */
export function parseYamlFile(filePath: string): unknown {
  logger.debug({ filePath }, 'Reading YAML file');

  const raw = readFileSync(filePath, 'utf-8');
  try {
    const parsed: unknown = parseYaml(raw);
    logger.debug({ filePath }, 'YAML parsed successfully');
    return parsed;
  } catch (error) {
    throw new YamlParseError(filePath, error);
  }
}
