/** @generated —
 * Helper to create empty trait code sections.
 *
 * WHY: Many traits only produce output for some sections
 * (e.g. migration trait doesn't produce routes). This avoids
 * repeating empty array boilerplate in every trait.
 */

import type { TraitCodeSection } from './trait.types.js';

/** Create an empty code section with no content */
export function emptySection(): TraitCodeSection {
  return { imports: [], types: [], functions: [], sql: [], routes: [] };
}

/** Create a section with only SQL statements */
export function sqlOnlySection(sql: string[]): TraitCodeSection {
  return { imports: [], types: [], functions: [], sql, routes: [] };
}
