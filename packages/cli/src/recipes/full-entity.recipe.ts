/** @generated —
 * Full entity recipe — YAML → 8+ generated files.
 *
 * WHY: This is the primary recipe. One YAML file produces types,
 * migration, repository (with traits), routes, and barrel updates.
 * Replaces running 8 separate generators by hand.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep } from './recipe.types.js';
import { parseEntitySchema } from '../schema/entity-schema.parser.js';
import { validateEntitySchema } from '../schema/entity-schema.validator.js';
import { registerDefaultTraits } from '../traits/register-defaults.js';
import { toKebabCase } from '../generators/utils.js';
import type { EntitySchema } from '../schema/entity-schema.types.js';
import { generateTypesStep, generateMigrationStep, composeTraitsStep } from './full-entity.steps.js';
import { updateBarrelsStep } from './full-entity.barrel-step.js';

/** Parse YAML and store schema in shared context */
const parseStep: RecipeStep = {
  name: 'parse-yaml',
  description: 'Parse entity YAML schema',
  async run(ctx) {
    const yamlPath = resolve(ctx.projectRoot, ctx.options['from'] as string);
    const schema = parseEntitySchema(yamlPath);
    return { files: [], shared: { schema, kebab: toKebabCase(schema.name) } };
  },
};

/** Validate parsed schema */
const validateStep: RecipeStep = {
  name: 'validate-schema',
  description: 'Validate entity schema',
  async run(ctx) {
    const schema = ctx.shared['schema'] as EntitySchema;
    const errors = validateEntitySchema(schema);
    if (errors.length > 0) {
      throw new Error(errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
    }
    return { files: [] };
  },
};

/** The full-entity recipe definition */
export const fullEntityRecipe: Recipe = {
  name: 'full-entity',
  description: 'Generate all files for an entity from YAML schema',
  steps: [parseStep, validateStep, generateTypesStep,
    generateMigrationStep, composeTraitsStep, updateBarrelsStep],
  hooks: {
    async before() { registerDefaultTraits(); },
  },
};
