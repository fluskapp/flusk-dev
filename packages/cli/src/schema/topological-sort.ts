/** @generated —
 * Topological sort for entity dependency ordering.
 *
 * WHY: SQLite migrations must create parent tables before
 * children (FK constraints). Topological sort ensures correct
 * ordering based on belongs-to relations.
 */

/**
 * Topologically sort entities by their dependency graph.
 * Returns entity names in safe creation order (parents first).
 * Throws if a cycle exists (should be caught by validator first).
 */
export function topologicalSort(
  graph: Map<string, string[]>,
): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  for (const node of graph.keys()) {
    visit(node, graph, visited, temp, sorted);
  }

  return sorted;
}

/** DFS visit for topological sort */
function visit(
  node: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
  temp: Set<string>,
  sorted: string[],
): void {
  if (visited.has(node)) return;
  if (temp.has(node)) {
    throw new Error(`Cycle detected at "${node}"`);
  }

  temp.add(node);
  for (const dep of graph.get(node) ?? []) {
    visit(dep, graph, visited, temp, sorted);
  }
  temp.delete(node);
  visited.add(node);
  sorted.push(node);
}
