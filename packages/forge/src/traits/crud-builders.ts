/**
 * Builder functions for CRUD trait code generation.
 *
 * WHY: Extracted from crud.trait.ts to keep each file under 100 lines.
 * Each builder produces a string of generated TypeScript code.
 */

export { toSnake, buildRowToEntity, buildHelpers } from './crud-builders-row.js';
export {
  buildCreate,
  buildFindById,
  buildList,
  buildUpdate,
  buildDelete,
} from './crud-builders-ops.js';

/** Re-export route builders from dedicated module */
export { buildCrudRoutes } from './crud-route-builders.js';
