/**
 * Generate index.ts barrel file for an entity.
 */

import type { EntityDef } from './types.js';
import { HEADER } from './types.js';

export function genIndex(entity: EntityDef): string {
  const extras = entity.extraBarrelExports ?? [];
  const extraLines = extras.length > 0 ? '\n' + extras.join('\n') : '';

  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
/**
 * SQLite ${entity.label} Repository barrel
 */

export { create } from './create.js';
export { findById } from './find-by-id.js';
export { list } from './list.js';
export { update } from './update.js';
// --- END GENERATED ---

// --- BEGIN CUSTOM ---${extraLines}
// --- END CUSTOM ---
`;
}
