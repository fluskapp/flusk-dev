/** @generated —
 * Generated file header with provenance and staleness hash.
 *
 * WHY: Every generated file needs metadata so the regeneration
 * system can detect staleness and trace back to the source YAML.
 */

import { computeHash } from './yaml-hash.js';

/** Metadata embedded in generated file headers */
export interface FileHeaderInfo {
  yamlPath: string;
  yamlHash: string;
  timestamp: string;
}

/** Build a file header comment block */
export function buildFileHeader(yamlPath: string, yamlContent: string): string {
  const hash = computeHash(yamlContent);
  const ts = new Date().toISOString();
  return [
    `/**`,
    ` * @generated from ${yamlPath}`,
    ` * Hash: ${hash}`,
    ` * Generated: ${ts}`,
    ` * DO NOT EDIT generated sections — changes will be overwritten.`,
    ` */`,
  ].join('\n');
}

/** Parse header fields from an existing generated file */
export function parseFileHeader(content: string): FileHeaderInfo | null {
  const yamlMatch = content.match(/@generated from (.+)$/m);
  const hashMatch = content.match(/Hash: ([a-f0-9]{64})$/m);
  const tsMatch = content.match(/Generated: (.+)$/m);
  if (!yamlMatch || !hashMatch) return null;
  return {
    yamlPath: yamlMatch[1].trim(),
    yamlHash: hashMatch[1].trim(),
    timestamp: tsMatch?.[1]?.trim() ?? '',
  };
}
