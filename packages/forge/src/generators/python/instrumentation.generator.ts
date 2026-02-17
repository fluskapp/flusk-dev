/**
 * Python instrumentation generator — provider YAML → OTel wrapper.
 *
 * WHY: Generates Python monkey-patch modules that wrap LLM SDKs
 * to emit OpenTelemetry spans, mirroring the Node.js instrumentations.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import type { ProviderYaml } from '../provider-yaml.types.js';
import { renderPythonInstrumentation } from '../../templates/python/instrumentation.template.js';

const OUT_DIR = 'flusk-py/src/flusk/instrumentations';

export async function generatePythonInstrumentation(
  cfg: ProviderYaml,
  projectRoot: string,
): Promise<{ path: string; content: string }> {
  const outDir = resolve(projectRoot, OUT_DIR);
  await mkdir(outDir, { recursive: true });

  const content = renderPythonInstrumentation(cfg);
  const fileName = `${cfg.name}.py`;
  await writeFile(resolve(outDir, fileName), content, 'utf-8');

  return { path: `${OUT_DIR}/${fileName}`, content };
}
