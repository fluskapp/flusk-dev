/**
 * Standalone route generator — creates route directory with handler
 */

import { resolve } from 'node:path';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { toPascalCase } from './utils.js';

export interface RouteResult {
  files: string[];
}

/**
 * Generate a standalone route with directory structure
 */
export async function generateStandaloneRoute(
  name: string,
  prefix: string
): Promise<RouteResult> {
  const root = process.cwd();
  const routeDir = resolve(root, `packages/execution/src/routes/${name}-routes`);
  const files: string[] = [];

  await mkdir(routeDir, { recursive: true });

  // index.ts — route registration
  await writeFile(resolve(routeDir, 'index.ts'), indexTemplate(name), 'utf-8');
  files.push(`packages/execution/src/routes/${name}-routes/index.ts`);

  // handler file
  await writeFile(resolve(routeDir, `${name}.ts`), handlerTemplate(name), 'utf-8');
  files.push(`packages/execution/src/routes/${name}-routes/${name}.ts`);

  // Register in app.ts
  await registerRoute(name, prefix, root);
  files.push('packages/execution/src/app.ts (updated)');

  return { files };
}

function indexTemplate(name: string): string {
  const fnName = `${name.replace(/-/g, '')}Routes`;
  return `/**
 * ${toPascalCase(name)} standalone routes
 */

import type { FastifyInstance } from 'fastify';
import { register${toPascalCase(name)}Handlers } from './${name}.js';

/** Register ${name} routes */
export async function ${fnName}(fastify: FastifyInstance): Promise<void> {
  register${toPascalCase(name)}Handlers(fastify);
}
`;
}

function handlerTemplate(name: string): string {
  const pascal = toPascalCase(name);
  return `/**
 * ${pascal} route handlers
 */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getLogger } from '@flusk/logger';

const logger = getLogger().child({ module: '${name}-routes' });

/** Register ${name} handlers */
export function register${pascal}Handlers(fastify: FastifyInstance): void {
  fastify.get('/', {
    schema: { response: { 200: Type.Object({ status: Type.String() }) } },
  }, async (request) => {
    logger.info({ url: request.url }, '${name} request');
    return { status: 'ok' };
  });
}
`;
}

async function registerRoute(name: string, prefix: string, root: string): Promise<void> {
  const appPath = resolve(root, 'packages/execution/src/app.ts');
  let content = await readFile(appPath, 'utf-8');
  const fnName = `${name.replace(/-/g, '')}Routes`;

  if (content.includes(fnName)) return;

  const importLine = `import { ${fnName} } from './routes/${name}-routes/index.js';`;
  const lastImport = content.lastIndexOf('import ');
  const lineEnd = content.indexOf('\n', lastImport);
  content = content.slice(0, lineEnd + 1) + importLine + '\n' + content.slice(lineEnd + 1);

  const marker = `{ prefix: '/api/v1' }`;
  const idx = content.indexOf(marker);
  if (idx === -1) return;
  const brace = content.lastIndexOf('},', idx);
  const insertPt = content.lastIndexOf('\n', brace);
  const line = `      await api.register(${fnName}, { prefix: '${prefix}' });`;
  content = content.slice(0, insertPt) + '\n' + line + content.slice(insertPt);

  await writeFile(appPath, content, 'utf-8');
}
