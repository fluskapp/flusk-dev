/** @generated —
 * Smart merge engine — update generated sections, preserve custom.
 *
 * WHY: When YAML changes, we regenerate code but must keep
 * any custom code the developer added inside CUSTOM regions.
 * This is the heart of safe incremental regeneration.
 */

import { createLogger } from '@flusk/logger';
import { parseRegions, extractCustomSections } from './region-parser.js';
import type { ParsedRegion } from './region-parser.js';

const logger = createLogger({ name: 'regen:merge' });

/** Result of a smart merge operation */
export interface MergeResult {
  content: string;
  customSectionsPreserved: number;
  warnings: string[];
}

/**
 * Merge new generated content with existing file content.
 * GENERATED sections are replaced; CUSTOM sections are preserved.
 */
export function smartMerge(
  newContent: string,
  existingContent: string,
): MergeResult {
  const oldCustom = extractCustomSections(existingContent);
  const newRegions = parseRegions(newContent);
  const warnings: string[] = [];
  let preserved = 0;

  const merged = newRegions.map((region) => {
    if (region.kind !== 'custom') return region;
    const key = region.label || findCustomKey(region, newRegions);
    const existing = oldCustom.get(key);
    if (existing && existing.trim()) {
      preserved++;
      oldCustom.delete(key);
      logger.info({ label: key }, 'Preserved custom section');
      return { ...region, content: existing } satisfies ParsedRegion;
    }
    return region;
  });

  for (const [label, content] of oldCustom) {
    if (content.trim()) {
      warnings.push(`Orphaned custom section "${label}" — trait may have been removed`);
      logger.warn({ label }, 'Orphaned custom section');
    }
  }

  return { content: regionsToString(merged), customSectionsPreserved: preserved, warnings };
}

/** Rebuild file content from parsed regions */
function regionsToString(regions: ParsedRegion[]): string {
  return regions.map((r) => {
    if (r.kind === 'static') return r.content;
    const tag = r.kind === 'generated' ? 'GENERATED (do not edit)' : 'CUSTOM';
    const label = r.label ? ` [${r.label}]` : '';
    return `// --- BEGIN ${tag}${label} ---\n${r.content}\n// --- END ${r.kind === 'generated' ? 'GENERATED' : 'CUSTOM'} ---`;
  }).join('\n');
}

/** Fallback key when custom section has no label */
function findCustomKey(
  region: ParsedRegion,
  regions: ParsedRegion[],
): string {
  let idx = 0;
  for (const r of regions) {
    if (r === region) return `custom-${idx}`;
    if (r.kind === 'custom') idx++;
  }
  return `custom-${idx}`;
}
