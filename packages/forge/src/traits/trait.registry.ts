/**
 * Trait registry — register, lookup, and resolve trait chains.
 *
 * WHY: Traits have dependencies on each other (soft-delete needs crud).
 * The registry validates these dependencies and resolves the full chain
 * of traits needed for a given set of capabilities.
 */

import { createLogger } from '@flusk/logger';
import type { Trait } from './trait.types.js';

const logger = createLogger({ name: 'traits:registry' });

/** Stores registered traits by name */
const registry = new Map<string, Trait>();

/**
 * Register a trait in the global registry.
 * Throws if a trait with the same name already exists.
 */
export function registerTrait(trait: Trait): void {
  if (registry.has(trait.name)) {
    throw new Error(`Trait "${trait.name}" is already registered`);
  }
  registry.set(trait.name, trait);
  logger.debug({ trait: trait.name }, 'Trait registered');
}

/**
 * Lookup a trait by name. Returns undefined if not found.
 */
export function getTrait(name: string): Trait | undefined {
  return registry.get(name);
}

/**
 * Validate that all dependencies for a trait are registered.
 * Returns list of missing dependency names.
 */
export function validateDependencies(traitName: string): string[] {
  const trait = registry.get(traitName);
  if (!trait) return [traitName];
  return trait.dependencies.filter((dep) => !registry.has(dep));
}

/**
 * Resolve the full trait chain for a list of capability names.
 * Includes transitive dependencies, topologically sorted.
 * Throws on missing traits or circular dependencies.
 */
export function resolveTraitChain(capabilities: string[]): Trait[] {
  const visited = new Set<string>();
  const resolved: Trait[] = [];

  /** Depth-first resolve with cycle detection */
  function resolve(name: string, stack: Set<string>): void {
    if (visited.has(name)) return;
    if (stack.has(name)) {
      throw new Error(`Circular dependency: ${[...stack, name].join(' → ')}`);
    }
    const trait = registry.get(name);
    if (!trait) throw new Error(`Unknown trait: "${name}"`);

    stack.add(name);
    for (const dep of trait.dependencies) resolve(dep, stack);
    stack.delete(name);

    visited.add(name);
    resolved.push(trait);
  }

  for (const cap of capabilities) resolve(cap, new Set());
  logger.info({ resolved: resolved.map((t) => t.name) }, 'Trait chain resolved');
  return resolved;
}

/** Clear registry — for testing only */
export function clearRegistry(): void {
  registry.clear();
}
