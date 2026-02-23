/**
 * Enhanced guard checks — block non-generator code, detect tampering,
 * warn on large CUSTOM sections.
 *
 * WHY: Make it impossible to add code without going through generators/YAML.
 * This module provides the core logic; the CLI guard command consumes it.
 */

export type {
  EnhancedGuardResult,
  TamperedGeneratedFile,
  LargeCustomSection,
} from './enhanced-guard-types.js';

export { findMissingHeaders } from './enhanced-guard-find-missing.js';
export { detectGeneratedTampering } from './enhanced-guard-tampering.js';
export { findLargeCustomSections } from './enhanced-guard-custom-size.js';

import type { EnhancedGuardResult } from './enhanced-guard-types.js';
import { findMissingHeaders } from './enhanced-guard-find-missing.js';
import { detectGeneratedTampering } from './enhanced-guard-tampering.js';
import { findLargeCustomSections } from './enhanced-guard-custom-size.js';

/**
 * Run all enhanced guard checks.
 */
export function runEnhancedGuard(projectRoot: string): EnhancedGuardResult {
  return {
    missingHeaders: findMissingHeaders(projectRoot),
    tamperedFiles: detectGeneratedTampering(projectRoot),
    largeCustomSections: findLargeCustomSections(projectRoot),
  };
}
