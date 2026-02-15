/**
 * Unit tests for dependency graph and cycle detection
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildDependencyGraph, detectCircularDeps } from './dependency-graph.js';
import { topologicalSort } from './topological-sort.js';
import type { EntitySchema } from './entity-schema.types.js';

function entity(name: string, relations?: EntitySchema['relations']): EntitySchema {
  return { name, fields: {}, relations };
}

describe('Dependency Graph', () => {
  test('builds graph from belongs-to relations', () => {
    const schemas = [
      entity('Child', {
        parent: { entity: 'Parent', type: 'belongs-to' },
      }),
      entity('Parent'),
    ];
    const graph = buildDependencyGraph(schemas);
    assert.deepStrictEqual(graph.get('Child'), ['Parent']);
    assert.deepStrictEqual(graph.get('Parent'), []);
  });

  test('detects circular dependencies', () => {
    const schemas = [
      entity('A', { b: { entity: 'B', type: 'belongs-to' } }),
      entity('B', { a: { entity: 'A', type: 'belongs-to' } }),
    ];
    const graph = buildDependencyGraph(schemas);
    const errors = detectCircularDeps(graph);
    assert.ok(errors.length > 0);
  });

  test('no errors for acyclic graph', () => {
    const schemas = [
      entity('Child', {
        parent: { entity: 'Parent', type: 'belongs-to' },
      }),
      entity('Parent'),
    ];
    const graph = buildDependencyGraph(schemas);
    assert.strictEqual(detectCircularDeps(graph).length, 0);
  });
});

describe('Topological Sort', () => {
  test('orders parents before children', () => {
    const schemas = [
      entity('Child', {
        parent: { entity: 'Parent', type: 'belongs-to' },
      }),
      entity('Parent'),
    ];
    const graph = buildDependencyGraph(schemas);
    const sorted = topologicalSort(graph);
    assert.ok(sorted.indexOf('Parent') < sorted.indexOf('Child'));
  });
});
