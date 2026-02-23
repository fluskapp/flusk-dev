/**
 * Types and constants for enhanced guard checks.
 */

/** Result of enhanced guard scan */
export interface EnhancedGuardResult {
  missingHeaders: string[];
  tamperedFiles: TamperedGeneratedFile[];
  largeCustomSections: LargeCustomSection[];
}

/** A file where GENERATED section hash doesn't match expected */
export interface TamperedGeneratedFile {
  filePath: string;
  sectionLabel: string;
  expectedHash: string;
  actualHash: string;
}

/** A CUSTOM section that exceeds the line threshold */
export interface LargeCustomSection {
  filePath: string;
  sectionLabel: string;
  lineCount: number;
}

export const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.turbo', 'coverage', '.git',
]);

export const MAX_CUSTOM_LINES = 30;
