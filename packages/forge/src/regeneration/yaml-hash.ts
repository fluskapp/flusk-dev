/**
 * SHA-256 hashing for YAML content — staleness detection.
 *
 * WHY: By storing the hash of the YAML in generated file headers,
 * we can cheaply detect which files are stale without diffing content.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Compute SHA-256 hex digest of arbitrary content */
export function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/** Compute hash of a YAML file on disk */
export function hashYamlFile(yamlPath: string): string {
  const content = readFileSync(yamlPath, 'utf-8');
  return computeHash(content);
}

/** Check if a stored hash matches the current YAML file */
export function isStale(yamlPath: string, storedHash: string): boolean {
  return hashYamlFile(yamlPath) !== storedHash;
}
