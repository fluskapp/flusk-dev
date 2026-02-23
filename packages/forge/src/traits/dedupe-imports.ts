/**
 * Import deduplication utility for trait composition.
 *
 * WHY: When merging multiple trait outputs, imports need to be
 * deduplicated and named imports from the same module merged.
 */

/** Deduplicate import lines, merging named imports from the same module */
export function dedupeImports(imports: string[]): string[] {
  const moduleMap = new Map<string, Set<string>>();
  const nonStandard: string[] = [];

  for (const imp of imports) {
    // Match: import type? { ... } from '...';
    const match = imp.match(
      /^import\s+(type\s+)?{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
    );
    if (match) {
      const prefix = match[1] ?? '';
      const names = match[2].split(',').map((s) => s.trim()).filter(Boolean);
      const mod = `${prefix.trim()}|${match[3]}`;
      if (!moduleMap.has(mod)) moduleMap.set(mod, new Set());
      for (const n of names) moduleMap.get(mod)!.add(n);
    } else {
      nonStandard.push(imp);
    }
  }

  const merged: string[] = [];
  for (const [mod, names] of moduleMap) {
    const [prefix, path] = mod.split('|');
    const keyword = prefix ? `import type` : `import`;
    merged.push(`${keyword} { ${[...names].join(', ')} } from '${path}';`);
  }

  return [...merged, ...new Set(nonStandard)];
}
