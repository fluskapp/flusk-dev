/**
 * Tests for trait registry — registration, lookup, chain resolution.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  registerTrait, getTrait, resolveTraitChain,
  validateDependencies, clearRegistry,
} from './trait.registry.js';
import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { emptySection } from './section-helpers.js';

/** Create a stub trait for testing */
function stubTrait(
  name: string,
  deps: string[] = [],
): Trait {
  return {
    name,
    description: `Stub ${name}`,
    dependencies: deps,
    generate: (): TraitOutput => ({
      traitName: name,
      repository: emptySection(),
      route: emptySection(),
      migration: emptySection(),
    }),
  };
}

describe('TraitRegistry', () => {
  beforeEach(() => clearRegistry());

  test('registers and retrieves a trait', () => {
    const t = stubTrait('crud');
    registerTrait(t);
    assert.strictEqual(getTrait('crud'), t);
  });

  test('throws on duplicate registration', () => {
    registerTrait(stubTrait('crud'));
    assert.throws(() => registerTrait(stubTrait('crud')));
  });

  test('returns undefined for unknown trait', () => {
    assert.strictEqual(getTrait('unknown'), undefined);
  });

  test('validates missing dependencies', () => {
    registerTrait(stubTrait('soft-delete', ['crud']));
    const missing = validateDependencies('soft-delete');
    assert.deepStrictEqual(missing, ['crud']);
  });

  test('resolves simple trait chain', () => {
    registerTrait(stubTrait('crud'));
    registerTrait(stubTrait('export', ['crud']));
    const chain = resolveTraitChain(['export']);
    assert.deepStrictEqual(chain.map((t) => t.name), ['crud', 'export']);
  });

  test('resolves chain with multiple capabilities', () => {
    registerTrait(stubTrait('crud'));
    registerTrait(stubTrait('time-range'));
    registerTrait(stubTrait('aggregation'));
    const chain = resolveTraitChain(['crud', 'time-range', 'aggregation']);
    assert.strictEqual(chain.length, 3);
  });

  test('deduplicates shared dependencies', () => {
    registerTrait(stubTrait('crud'));
    registerTrait(stubTrait('export', ['crud']));
    registerTrait(stubTrait('soft-delete', ['crud']));
    const chain = resolveTraitChain(['export', 'soft-delete']);
    const names = chain.map((t) => t.name);
    assert.strictEqual(names.filter((n) => n === 'crud').length, 1);
  });

  test('throws on circular dependencies', () => {
    registerTrait(stubTrait('a', ['b']));
    registerTrait(stubTrait('b', ['a']));
    assert.throws(() => resolveTraitChain(['a']), /Circular/);
  });

  test('throws on unknown trait', () => {
    assert.throws(() => resolveTraitChain(['nonexistent']), /Unknown/);
  });
});
