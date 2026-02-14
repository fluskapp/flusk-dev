/** @generated —
 * Region marker constants and wrapping utilities.
 *
 * WHY: Generated files use markers to separate machine-owned
 * sections from user-owned custom code. This enables safe
 * regeneration without losing hand-written business logic.
 */

/** Marker for start of a machine-generated section */
export const BEGIN_GENERATED = '// --- BEGIN GENERATED (do not edit) ---';

/** Marker for end of a machine-generated section */
export const END_GENERATED = '// --- END GENERATED ---';

/** Marker for start of a user-owned custom section */
export const BEGIN_CUSTOM = '// --- BEGIN CUSTOM ---';

/** Marker for end of a user-owned custom section */
export const END_CUSTOM = '// --- END CUSTOM ---';

/** Wrap code in GENERATED markers with an optional label */
export function wrapGenerated(code: string, label?: string): string {
  const tag = label ? `${BEGIN_GENERATED.slice(0, -4)} [${label}] ---` : BEGIN_GENERATED;
  return `${tag}\n${code}\n${END_GENERATED}`;
}

/** Wrap code in CUSTOM markers with an optional label */
export function wrapCustom(code: string, label?: string): string {
  const tag = label ? `${BEGIN_CUSTOM.slice(0, -4)} [${label}] ---` : BEGIN_CUSTOM;
  return `${tag}\n${code}\n${END_CUSTOM}`;
}

/** Create an empty CUSTOM section placeholder */
export function emptyCustomSection(label?: string): string {
  return wrapCustom('', label);
}
