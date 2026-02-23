/**
 * Function generation — reads YAML and writes output files.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parse } from 'yaml';
import { toKebabCase } from '../utils.js';
import type { FnSchema, FnGenResult } from './function.types.js';
import { renderFunctionContent } from './function-render.js';
import { renderTestContent, renderNamespaceBarrel, renderPrimitivesBarrel } from './function-render-test.js';

/** Load and parse a .fn.yaml file */
export async function loadFnSchema(yamlPath: string): Promise<FnSchema> {
  const raw = await readFile(yamlPath, 'utf-8');
  return parse(raw) as FnSchema;
}

/** Generate a single function from a .fn.yaml path */
export async function generateFunction(
  yamlPath: string,
  projectRoot: string,
): Promise<FnGenResult> {
  const schema = await loadFnSchema(yamlPath);
  const kebab = toKebabCase(schema.name);
  const result: FnGenResult = { files: [] };

  const nsDir = resolve(projectRoot, `packages/business-logic/src/primitives/${schema.namespace}`);
  const testDir = resolve(nsDir, '__tests__');
  await mkdir(testDir, { recursive: true });

  const fnPath = resolve(nsDir, `${kebab}.function.ts`);
  const fnContent = renderFunctionContent(schema);
  const fnAction = existsSync(fnPath) ? 'updated' : 'created';
  await writeFile(fnPath, fnContent, 'utf-8');
  result.files.push({ path: `packages/business-logic/src/primitives/${schema.namespace}/${kebab}.function.ts`, action: fnAction });

  const testPath = resolve(testDir, `${kebab}.function.test.ts`);
  const testContent = renderTestContent(schema);
  const testAction = existsSync(testPath) ? 'updated' : 'created';
  await writeFile(testPath, testContent, 'utf-8');
  result.files.push({ path: `packages/business-logic/src/primitives/${schema.namespace}/__tests__/${kebab}.function.test.ts`, action: testAction });

  return result;
}

/** Regenerate namespace barrel */
export async function updateNamespaceBarrel(
  namespace: string,
  projectRoot: string,
): Promise<{ path: string; action: 'created' | 'updated' }> {
  const nsDir = resolve(projectRoot, `packages/business-logic/src/primitives/${namespace}`);
  const files = await readdir(nsDir);
  const names = files
    .filter(f => f.endsWith('.function.ts'))
    .map(f => f.replace('.function.ts', ''));
  const content = renderNamespaceBarrel(names);
  const indexPath = resolve(nsDir, 'index.ts');
  const action = existsSync(indexPath) ? 'updated' : 'created';
  await writeFile(indexPath, content, 'utf-8');
  return { path: `packages/business-logic/src/primitives/${namespace}/index.ts`, action };
}

/** Regenerate the primitives master barrel */
export async function updatePrimitivesBarrel(
  namespaces: string[],
  projectRoot: string,
): Promise<{ path: string; action: 'created' | 'updated' }> {
  const primDir = resolve(projectRoot, 'packages/business-logic/src/primitives');
  await mkdir(primDir, { recursive: true });
  const content = renderPrimitivesBarrel(namespaces);
  const indexPath = resolve(primDir, 'index.ts');
  const action = existsSync(indexPath) ? 'updated' : 'created';
  await writeFile(indexPath, content, 'utf-8');
  return { path: 'packages/business-logic/src/primitives/index.ts', action };
}
