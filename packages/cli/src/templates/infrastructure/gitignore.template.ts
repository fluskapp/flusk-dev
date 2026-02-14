/** @generated —
 * Template for .gitignore generation
 * Comprehensive ignore patterns for Node.js/TypeScript Flusk projects
 */

import { getCoreIgnorePatterns } from './gitignore-core.js';
import { getIdeOsAndProjectPatterns } from './gitignore-ide-os.js';

/**
 * Generate .gitignore template for Flusk projects
 */
export function generateGitignoreTemplate(): string {
  return getCoreIgnorePatterns() + '\n' + getIdeOsAndProjectPatterns();
}
