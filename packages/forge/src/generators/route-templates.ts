/**
 * Route generator — file content templates.
 */

import { toPascalCase } from './utils.js';

export function indexTemplate(name: string): string {
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

export function handlerTemplate(name: string): string {
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
