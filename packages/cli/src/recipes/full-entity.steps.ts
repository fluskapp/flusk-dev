/**
 * Individual steps for the full-entity recipe.
 *
 * WHY: Each step is isolated for testability and the 100-line rule.
 * Steps share data through RecipeContext.shared.
 */

import { resolve } from 'node:path';
import type { RecipeStep } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import { generateTypeBoxContent } from '../schema/generate-typebox.js';
import { generateMigrationSql } from '../schema/generate-migration.js';
import { generateTypesFileContent } from '../schema/generate-types-file.js';
import { composeTraits } from '../traits/trait.composer.js';
import { generateMultiFileRepo } from '../generators/multi-file-repo.js';
import type { EntitySchema, StorageTarget } from '../schema/entity-schema.types.js';

/** Generate TypeBox entity schema file */
export const generateTypesStep: RecipeStep = {
  name: 'generate-types',
  description: 'Generate TypeBox entity + types files',
  async run(ctx) {
    const schema = ctx.shared['schema'] as EntitySchema;
    const kebab = ctx.shared['kebab'] as string;
    const entityDir = resolve(ctx.projectRoot, 'packages/entities/src');
    const typesDir = resolve(ctx.projectRoot, 'packages/types/src');
    return {
      files: [
        writeRecipeFile(ctx, entityDir, `${kebab}.entity.ts`,
          generateTypeBoxContent(schema)),
        writeRecipeFile(ctx, typesDir, `${kebab}.types.ts`,
          generateTypesFileContent(schema)),
      ],
    };
  },
};

/** Generate SQLite migration SQL */
export const generateMigrationStep: RecipeStep = {
  name: 'generate-migration',
  description: 'Generate SQLite migration SQL',
  async run(ctx) {
    const schema = ctx.shared['schema'] as EntitySchema;
    const kebab = ctx.shared['kebab'] as string;
    const dir = resolve(ctx.projectRoot, 'packages/resources/src/sqlite/sql');
    return {
      files: [writeRecipeFile(ctx, dir, `${kebab}.sql`,
        generateMigrationSql(schema))],
    };
  },
};

/** Compose traits into repository + routes (multi-file output) */
export const composeTraitsStep: RecipeStep = {
  name: 'compose-traits',
  description: 'Generate repository with traits (multi-file)',
  when: (ctx) => {
    const schema = ctx.shared['schema'] as EntitySchema | undefined;
    return !!schema?.capabilities &&
      Object.values(schema.capabilities).some(Boolean);
  },
  async run(ctx) {
    const schema = ctx.shared['schema'] as EntitySchema;
    const kebab = ctx.shared['kebab'] as string;
    const targets: StorageTarget[] = schema.storage ?? ['sqlite'];
    const files = [];

    for (const target of targets) {
      if (target === 'sqlite') {
        // Generate multi-file repo structure
        const repoDir = resolve(ctx.projectRoot,
          `packages/resources/src/sqlite/repositories/${kebab}`);
        const repoFiles = generateMultiFileRepo(schema, {
          includeUpdate: true,
        });
        for (const rf of repoFiles) {
          files.push(writeRecipeFile(ctx, repoDir, rf.filename, rf.content));
        }
      } else {
        // Fallback to monolithic composer for non-sqlite targets
        const composed = composeTraits(schema, target);
        const repoDir = resolve(ctx.projectRoot,
          'packages/resources/src/repositories');
        files.push(writeRecipeFile(ctx, repoDir, `${kebab}.repository.ts`,
          composed.repository));
      }

      // Generate routes from composer
      const composed = composeTraits(schema, target);
      if (composed.route) {
        const routeDir = resolve(ctx.projectRoot,
          'packages/execution/src/routes');
        files.push(writeRecipeFile(ctx, routeDir, `${kebab}.routes.ts`,
          composed.route));
      }
    }
    return { files, shared: { traits: targets } };
  },
};
