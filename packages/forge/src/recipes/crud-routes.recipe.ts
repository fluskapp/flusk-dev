/**
 * CRUD routes recipe — generates a full CRUD route file and
 * registers it in the Fastify app.
 *
 * WHY: Routes are the most duplicated boilerplate in Flusk.
 * This recipe generates the route file + auto-registers in app.ts.
 */

import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Recipe, RecipeStep } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import { generateCrudRoutes } from '../generators/crud-routes.generator.js';
import { toCamelCase } from '../generators/utils.js';

const generateRouteFile: RecipeStep = {
  name: 'generate-crud-routes',
  description: 'Generate full CRUD route file from entity YAML',
  async run(ctx) {
    const entityName = ctx.options['name'] as string;
    const result = generateCrudRoutes({
      entityName,
      projectRoot: ctx.projectRoot,
    });
    const dir = resolve(
      ctx.projectRoot,
      'packages/execution/src/routes',
    );
    const filename = `${entityName}.routes.ts`;
    return {
      files: [writeRecipeFile(ctx, dir, filename, result.content)],
    };
  },
};

const registerInApp: RecipeStep = {
  name: 'register-crud-route',
  description: 'Register route in app.ts',
  async run(ctx) {
    const entityName = ctx.options['name'] as string;
    const camel = toCamelCase(entityName);
    const fnName = `${camel}Routes`;
    const appPath = resolve(
      ctx.projectRoot,
      'packages/execution/src/app.ts',
    );

    if (ctx.dryRun) {
      return { files: [{ path: appPath, action: 'updated' as const }] };
    }

    let content = readFileSync(appPath, 'utf-8');
    if (content.includes(fnName)) {
      return { files: [] };
    }

    // Add import
    const importLine =
      `import { ${fnName} } from './routes/${entityName}.routes.js';`;
    const lastImportIdx = content.lastIndexOf('import ');
    const lineEnd = content.indexOf('\n', lastImportIdx);
    content = content.slice(0, lineEnd + 1) +
      importLine + '\n' +
      content.slice(lineEnd + 1);

    // Add registration before program.parse or after last register
    const prefix = `/${entityName.replace(/-/g, '-')}s`;
    const registerLine =
      `      await api.register(${fnName}, { prefix: '${prefix}' });`;
    const marker = `{ prefix: '/api/v1' }`;
    const markerIdx = content.indexOf(marker);
    if (markerIdx !== -1) {
      const braceIdx = content.lastIndexOf('},', markerIdx);
      const insertPt = content.lastIndexOf('\n', braceIdx);
      content = content.slice(0, insertPt) + '\n' +
        registerLine + content.slice(insertPt);
    }

    writeFileSync(appPath, content, 'utf-8');
    return { files: [{ path: appPath, action: 'updated' as const }] };
  },
};

export const crudRoutesRecipe: Recipe = {
  name: 'crud-routes',
  description:
    'Generate full CRUD routes from entity YAML and register in app',
  steps: [generateRouteFile, registerInApp],
};
