/**
 * Provider generator — full LLM provider integration from YAML.
 */
import { resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { ProviderYaml } from './provider-yaml.types.js';
import { renderPricing } from './provider-tmpl-pricing.js';
import { renderSpanConfig } from './provider-tmpl-span-config.js';
import { renderInstrumentation } from './provider-tmpl-instrumentation.js';
import { renderInstrumentationTest } from './provider-tmpl-instr-test.js';
import { renderProviderTest } from './provider-tmpl-provider-test.js';
import { toPascalCase } from './utils.js';
import { generatePythonPricing } from './python/pricing.generator.js';
import { generatePythonInstrumentation } from './python/instrumentation.generator.js';

export type ProviderTarget = 'node' | 'python' | 'all';
export interface ProviderResult { files: { path: string; action: 'created' | 'updated' }[] }

export async function generateProvider(nameOrYamlPath: string, target: ProviderTarget = 'all'): Promise<ProviderResult> {
  const root = process.cwd();
  const result: ProviderResult = { files: [] };

  if (nameOrYamlPath.endsWith('.yaml') || nameOrYamlPath.endsWith('.yml')) {
    const cfg = await loadYaml(nameOrYamlPath);
    if (target === 'node' || target === 'all') await generateAll(cfg, root, result);
    if (target === 'python' || target === 'all') await generatePython(cfg, root, result);
  } else {
    // Legacy: name-only mode (no YAML) — basic scaffolding
    await generateLegacy(nameOrYamlPath, root, result);
  }
  return result;
}

async function loadYaml(p: string): Promise<ProviderYaml> { return parseYaml(await readFile(p, 'utf-8')) as ProviderYaml; }

async function generateAll(cfg: ProviderYaml, root: string, result: ProviderResult): Promise<void> {
  const blDir = `packages/business-logic/src/llm-call/providers`;
  const otelDir = `packages/otel/src/instrumentations`;
  await writeProviderFile(root, result, `${blDir}/${cfg.name}.pricing.ts`, renderPricing(cfg));
  await writeProviderFile(root, result, `${blDir}/${cfg.name}.span-config.ts`, renderSpanConfig(cfg));
  await writeProviderFile(root, result, `${blDir}/${cfg.name}.test.ts`, renderProviderTest(cfg));
  await writeProviderFile(root, result, `${otelDir}/${cfg.name}.ts`, renderInstrumentation(cfg));
  await writeProviderFile(root, result, `${otelDir}/${cfg.name}.test.ts`, renderInstrumentationTest(cfg));
  await patchCreateSdk(cfg, root, result);
  await patchParseSpan(cfg, root, result);
}

async function patchCreateSdk(cfg: ProviderYaml, root: string, result: ProviderResult): Promise<void> {
  const p = resolve(root, 'packages/otel/src/create-sdk.ts');
  let src = await readFile(p, 'utf-8');
  const pascal = toPascalCase(cfg.name);
  const importLine = `import { patch${pascal} } from './instrumentations/${cfg.name}.js';`;
  if (src.includes(importLine)) return;
  const callLine = `  patch${pascal}();`;
  // Add import after last import
  const lastImport = src.lastIndexOf('\nimport ');
  const eol = src.indexOf('\n', lastImport + 1);
  src = src.slice(0, eol + 1) + importLine + '\n' + src.slice(eol + 1);
  // Add call inside createSdk before "const traceExporter"
  src = src.replace('const traceExporter', callLine + '\n  const traceExporter');
  await writeFile(p, src, 'utf-8');
  result.files.push({ path: 'packages/otel/src/create-sdk.ts', action: 'updated' });
}

async function patchParseSpan(cfg: ProviderYaml, root: string, result: ProviderResult): Promise<void> {
  const p = resolve(root, 'packages/otel/src/exporters/parse-readable-span.ts');
  let src = await readFile(p, 'utf-8');
  const urlCheck = `url.includes('${cfg.apiUrls[0]}')`;
  if (src.includes(urlCheck)) return;
  // Add to detectProviderFromUrl
  const marker = `if (url.includes('bedrock'))`;
  const newLine = `  if (${urlCheck}) return '${cfg.name}';\n  `;
  src = src.replace(marker, newLine + marker);
  await writeFile(p, src, 'utf-8');
  result.files.push({ path: 'packages/otel/src/exporters/parse-readable-span.ts', action: 'updated' });
}

async function writeProviderFile(root: string, result: ProviderResult, relPath: string, content: string): Promise<void> {
  const abs = resolve(root, relPath);
  await mkdir(resolve(abs, '..'), { recursive: true });
  await writeFile(abs, content, 'utf-8');
  result.files.push({ path: relPath, action: 'created' });
}

async function generatePython(cfg: ProviderYaml, root: string, result: ProviderResult): Promise<void> {
  const pricing = await generatePythonPricing(cfg, root);
  result.files.push({ path: pricing.path, action: 'created' });
  const instr = await generatePythonInstrumentation(cfg, root);
  result.files.push({ path: instr.path, action: 'created' });
}

async function generateLegacy(name: string, root: string, result: ProviderResult): Promise<void> {
  const key = name.toUpperCase().replace(/-/g, '_');
  const dir = `packages/business-logic/src/llm-call/providers`;
  const pricing = `/**\n * ${name} pricing\n */\nexport const ${key}_PRICING: Record<string, { input: number; output: number }> = {};\n`;
  await writeProviderFile(root, result, `${dir}/${name}.pricing.ts`, pricing);
  const span = `/**\n * ${name} span config\n */\nexport const ${key}_SYSTEM_VALUES: string[] = [];\nexport const ${key}_MODEL_PREFIXES: string[] = [];\n`;
  await writeProviderFile(root, result, `${dir}/${name}.span-config.ts`, span);
}
