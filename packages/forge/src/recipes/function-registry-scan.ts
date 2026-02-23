/**
 * Scan for all .fn.yaml files grouped by namespace.
 */

import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';

const FN_SCHEMA_ROOT = 'packages/schema/functions';

export { FN_SCHEMA_ROOT };

/** Scan for all .fn.yaml files grouped by namespace */
export async function scanFnYamls(
  projectRoot: string,
): Promise<Map<string, string[]>> {
  const root = resolve(projectRoot, FN_SCHEMA_ROOT);
  const namespaces = await readdir(root);
  const result = new Map<string, string[]>();

  for (const ns of namespaces) {
    if (ns.startsWith('_') || ns.endsWith('.yaml')) continue;
    const nsDir = resolve(root, ns);
    const files = await readdir(nsDir).catch(() => []);
    const yamlFiles = files
      .filter(f => f.endsWith('.fn.yaml'))
      .map(f => resolve(nsDir, f));
    if (yamlFiles.length) result.set(ns, yamlFiles);
  }

  return result;
}
