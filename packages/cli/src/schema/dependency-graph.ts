/**
 * Dependency graph builder and circular dependency detector.
 *
 * WHY: Entities reference each other via relations. We need
 * topological ordering for migration generation (create parent
 * tables first) and must detect cycles that would break FK refs.
 */

import type { EntitySchema } from './entity-schema.types.js';
import type { SchemaError } from './shape-validator.js';

/** Build an adjacency list of entity dependencies from relations */
export function buildDependencyGraph(
  schemas: EntitySchema[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const schema of schemas) {
    graph.set(schema.name, []);
  }

  for (const schema of schemas) {
    if (!schema.relations) continue;
    for (const rel of Object.values(schema.relations)) {
      if (rel.type === 'belongs-to') {
        const deps = graph.get(schema.name) ?? [];
        deps.push(rel.entity);
        graph.set(schema.name, deps);
      }
    }
  }
  return graph;
}

/**
 * Detect circular dependencies in the entity graph.
 * Returns errors for each cycle found.
 */
export function detectCircularDeps(
  graph: Map<string, string[]>,
): SchemaError[] {
  const errors: SchemaError[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  for (const node of graph.keys()) {
    if (hasCycle(node, graph, visited, stack)) {
      errors.push({
        path: node,
        message: `Circular dependency detected involving "${node}"`,
      });
    }
  }
  return errors;
}

/** DFS cycle detection helper */
function hasCycle(
  node: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
  stack: Set<string>,
): boolean {
  if (stack.has(node)) return true;
  if (visited.has(node)) return false;

  visited.add(node);
  stack.add(node);

  for (const dep of graph.get(node) ?? []) {
    if (hasCycle(dep, graph, visited, stack)) return true;
  }

  stack.delete(node);
  return false;
}
