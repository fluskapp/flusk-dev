/**
 * Python package recipe — provider generation step.
 *
 * WHY: Generates Python pricing + instrumentation files from
 * provider YAML schemas, keeping python-package.steps.ts under 100 lines.
 */

import { resolve } from 'node:path';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { RecipeStep, StepResult } from './recipe.types.js';
import type { ProviderYaml } from '../generators/provider-yaml.types.js';
import { generatePythonPricing } from '../generators/python/pricing.generator.js';
import { generatePythonInstrumentation } from '../generators/python/instrumentation.generator.js';
import { generatePythonInit, listModules } from '../generators/python/init.generator.js';

export const providerStep: RecipeStep = {
  name: 'providers',
  description: 'Generate Python pricing + instrumentation from provider YAMLs',
  async run(ctx): Promise<StepResult> {
    const providerDir = resolve(ctx.projectRoot, 'packages/schema/providers');
    const yamlFiles = (await readdir(providerDir)).filter((f) => f.endsWith('.provider.yaml'));
    const files: Array<{ path: string; action: 'created' | 'updated' }> = [];

    for (const f of yamlFiles) {
      const raw = await readFile(resolve(providerDir, f), 'utf-8');
      const cfg = parseYaml(raw) as ProviderYaml;
      const [pricing, instr] = await Promise.all([
        generatePythonPricing(cfg, ctx.projectRoot),
        generatePythonInstrumentation(cfg, ctx.projectRoot),
      ]);
      files.push({ path: pricing.path, action: 'created' });
      files.push({ path: instr.path, action: 'created' });
    }

    // Generate __init__.py for pricing + instrumentations dirs
    const root = resolve(ctx.projectRoot, 'flusk-py/src/flusk');
    for (const d of ['pricing', 'instrumentations']) {
      const dir = resolve(root, d);
      await mkdir(dir, { recursive: true });
      const mods = await listModules(dir);
      await generatePythonInit(dir, mods);
      files.push({ path: `flusk-py/src/flusk/${d}/__init__.py`, action: 'created' });
    }

    return { files };
  },
};
