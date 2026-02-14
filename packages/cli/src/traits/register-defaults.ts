/** @generated —
 * Registers all built-in traits in the global registry.
 *
 * WHY: Traits must be registered before resolution. This module
 * registers the core traits so the pipeline can resolve capabilities
 * from entity YAML files without manual setup.
 */

import { registerTrait } from './trait.registry.js';
import { createCrudTrait } from './crud.trait.js';
import { createTimeRangeTrait } from './time-range.trait.js';
import { createAggregationTrait } from './aggregation.trait.js';
import { createSoftDeleteTrait } from './soft-delete.trait.js';
import { createExportTrait } from './export.trait.js';

let registered = false;

/** Reset registration state — for testing only */
export function resetDefaultTraits(): void {
  registered = false;
}

/** Register all default traits (idempotent) */
export function registerDefaultTraits(): void {
  if (registered) return;
  registerTrait(createCrudTrait());
  registerTrait(createTimeRangeTrait());
  registerTrait(createAggregationTrait());
  registerTrait(createSoftDeleteTrait());
  registerTrait(createExportTrait());
  registered = true;
}
