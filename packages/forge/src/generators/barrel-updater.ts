/**
 * Barrel export updater - appends exports to index.ts files
 * Idempotent: skips if export already exists
 *
 * Re-exports from split modules for backward compatibility.
 */

export {
  updateEntitiesBarrel,
  updateTypesBarrel,
  updateResourcesBarrel,
  updateBusinessLogicBarrel,
} from './barrel-updater-packages.js';

export { updateAppRegistration } from './barrel-updater-app.js';
