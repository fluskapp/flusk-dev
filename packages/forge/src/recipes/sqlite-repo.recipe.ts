/**
 * SQLite repository recipe — generates CRUD files for an entity.
 *
 * WHY: Every entity needs the same 6 files (create, find-by-id, list,
 * update, row-to-entity, index). This recipe generates them from entity
 * metadata, keeping custom code sections untouched.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep, RecipeContext } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import type { EntityDef } from './sqlite-repo/types.js';
import { APP_ENTITIES } from './sqlite-repo/entities-app.js';
import { ANALYTICS_ENTITIES } from './sqlite-repo/entities-analytics.js';
import { genCreate } from './sqlite-repo/gen-create.js';
import { genFindById, genList } from './sqlite-repo/gen-find-list.js';
import { genUpdate } from './sqlite-repo/gen-update.js';
import { genRowToEntity } from './sqlite-repo/gen-row-to-entity.js';
import { genIndex } from './sqlite-repo/gen-index.js';

export type { EntityDef, FieldDef } from './sqlite-repo/types.js';

const ENTITIES: EntityDef[] = [...APP_ENTITIES, ...ANALYTICS_ENTITIES];

/* ------------------------------------------------------------------ */
/*  Recipe steps                                                       */
/* ------------------------------------------------------------------ */

function makeEntitySteps(entity: EntityDef): RecipeStep[] {
  const dir = (ctx: RecipeContext) =>
    resolve(ctx.projectRoot, 'packages/resources/src/sqlite/repositories', entity.name);

  return [
    {
      name: `${entity.name}/create`,
      description: `Generate create.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'create.ts', genCreate(entity))] };
      },
    },
    {
      name: `${entity.name}/find-by-id`,
      description: `Generate find-by-id.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'find-by-id.ts', genFindById(entity))] };
      },
    },
    {
      name: `${entity.name}/list`,
      description: `Generate list.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'list.ts', genList(entity))] };
      },
    },
    {
      name: `${entity.name}/update`,
      description: `Generate update.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'update.ts', genUpdate(entity))] };
      },
    },
    {
      name: `${entity.name}/row-to-entity`,
      description: `Generate row-to-entity.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'row-to-entity.ts', genRowToEntity(entity))] };
      },
    },
    {
      name: `${entity.name}/index`,
      description: `Generate index.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'index.ts', genIndex(entity))] };
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Exported recipe                                                    */
/* ------------------------------------------------------------------ */

export const sqliteRepoRecipe: Recipe = {
  name: 'sqlite-repo',
  description: 'Generate SQLite CRUD repository files for all entities',
  steps: ENTITIES.flatMap(makeEntitySteps),
};

/** Exported for direct use in scripts */
export { ENTITIES as SQLITE_REPO_ENTITIES };
