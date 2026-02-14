/** @generated —
 * Regeneration system barrel — safe incremental code regeneration.
 */

export {
  BEGIN_GENERATED, END_GENERATED,
  BEGIN_CUSTOM, END_CUSTOM,
  wrapGenerated, wrapCustom, emptyCustomSection,
} from './region-markers.js';
export {
  buildFileHeader, parseFileHeader,
} from './file-header.js';
export type { FileHeaderInfo } from './file-header.js';
export {
  parseRegions, extractCustomSections, hasManualEdits,
} from './region-parser.js';
export type { ParsedRegion } from './region-parser.js';
export { smartMerge } from './smart-merge.js';
export type { MergeResult } from './smart-merge.js';
export { computeHash, hashYamlFile, isStale } from './yaml-hash.js';
export {
  detectChanges, DEFAULT_SCAN_DIRS,
} from './change-detector.js';
export type { GeneratedFileInfo, ChangeReport } from './change-detector.js';
