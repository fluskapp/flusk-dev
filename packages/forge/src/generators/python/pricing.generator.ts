/**
 * Python pricing generator — provider YAML → Python pricing file.
 *
 * WHY: Generates pricing dicts for flusk-py from the same
 * provider YAML used for Node.js, keeping both SDKs in sync.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { ProviderYaml } from '../provider-yaml.types.js';
import { renderPythonPricing } from '../../templates/python/pricing.template.js';

const OUT_DIR = 'flusk-py/src/flusk/pricing';

export async function generatePythonPricing(
  cfg: ProviderYaml,
  projectRoot: string,
): Promise<{ path: string; content: string }> {
  const outDir = resolve(projectRoot, OUT_DIR);
  await mkdir(outDir, { recursive: true });

  const content = renderPythonPricing(cfg);
  const fileName = `${cfg.name}.py`;
  await writeFile(resolve(outDir, fileName), content, 'utf-8');

  return { path: `${OUT_DIR}/${fileName}`, content };
}
