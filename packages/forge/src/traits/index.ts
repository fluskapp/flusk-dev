/**
 * Traits system barrel — public API for trait-based code generation.
 */

export type {
  Trait,
  TraitContext,
  TraitOutput,
  TraitCodeSection,
} from './trait.types.js';
export {
  registerTrait,
  getTrait,
  resolveTraitChain,
  validateDependencies,
  clearRegistry,
} from './trait.registry.js';
export {
  composeTraits,
  buildContext,
} from './trait.composer.js';
export type { ComposedOutput } from './trait.composer.js';
export { registerDefaultTraits, resetDefaultTraits } from './register-defaults.js';
export { createCrudTrait } from './crud.trait.js';
export { createTimeRangeTrait } from './time-range.trait.js';
export { createAggregationTrait } from './aggregation.trait.js';
export { createSoftDeleteTrait } from './soft-delete.trait.js';
export { createExportTrait } from './export.trait.js';
export { emptySection, sqlOnlySection } from './section-helpers.js';
