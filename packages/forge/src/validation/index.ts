/**
 * Validation utilities barrel — CI enforcement for generated files.
 */

export { detectTampering } from './tampering-detector.js';
export type { TamperedFile } from './tampering-detector.js';
export { computeRatio } from './ratio-calculator.js';
export type { RatioResult, PackageCounts } from './ratio-calculator.js';
