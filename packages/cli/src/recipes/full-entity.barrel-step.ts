/** @generated —
 * Barrel export update step for full-entity recipe.
 *
 * WHY: After generating entity files, barrel exports (index.ts)
 * must be updated so the new entity is importable by other packages.
 */

import type { RecipeStep } from './recipe.types.js';
import type { EntitySchema } from '../schema/entity-schema.types.js';
import { toKebabCase } from '../generators/utils.js';
import {
  updateEntitiesBarrel,
  updateTypesBarrel,
  updateResourcesBarrel,
} from '../generators/barrel-updater.js';

/** Update barrel exports for entities, types, and resources packages */
export const updateBarrelsStep: RecipeStep = {
  name: 'update-barrels',
  description: 'Update barrel exports (index.ts files)',
  async run(ctx) {
    if (ctx.dryRun) return { files: [] };
    const schema = ctx.shared['schema'] as EntitySchema;
    const kebab = toKebabCase(schema.name);
    await updateEntitiesBarrel(kebab, ctx.projectRoot);
    await updateTypesBarrel(kebab, ctx.projectRoot);
    const hasCaps = schema.capabilities &&
      Object.values(schema.capabilities).some(Boolean);
    if (hasCaps) {
      await updateResourcesBarrel(kebab, ctx.projectRoot);
    }
    return { files: [] };
  },
};
