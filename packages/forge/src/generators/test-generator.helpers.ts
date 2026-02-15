/**
 * Test Generator Helpers - File analysis and type detection
 */

import fs from 'fs/promises';
import path from 'path';

export interface FileAnalysis {
  functions: string[];
  classes: string[];
  isRepository: boolean;
  isRoute: boolean;
  hasDatabase: boolean;
  hasExternalApi: boolean;
  endpoint?: string;
  method?: string;
}

/**
 * Analyze source file to detect functions, classes, and patterns
 */
export async function analyzeSourceFile(filePath: string): Promise<FileAnalysis> {
  const content = await fs.readFile(filePath, 'utf-8');

  const analysis: FileAnalysis = {
    functions: [],
    classes: [],
    isRepository: false,
    isRoute: false,
    hasDatabase: false,
    hasExternalApi: false,
  };

  const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    analysis.functions.push(match[1]);
  }

  const classRegex = /export\s+class\s+(\w+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    analysis.classes.push(match[1]);
  }

  if (filePath.includes('repository') || filePath.includes('repositories')) {
    analysis.isRepository = true;
  }

  if (filePath.includes('route') || filePath.includes('routes')) {
    analysis.isRoute = true;
    const routeRegex = /\.(\w+)\s*\(\s*['"`]([^'"`]+)['"`]/;
    const routeMatch = content.match(routeRegex);
    if (routeMatch) {
      analysis.method = routeMatch[1].toUpperCase();
      analysis.endpoint = routeMatch[2];
    }
  }

  if (content.includes('knex') || content.includes('db.') || content.includes('transaction')) {
    analysis.hasDatabase = true;
  }

  if (content.includes('axios') || content.includes('fetch') || content.includes('http')) {
    analysis.hasExternalApi = true;
  }

  return analysis;
}

/**
 * Determine test type based on file analysis
 */
export function determineTestType(analysis: FileAnalysis, explicitType?: string): 'unit' | 'integration' | 'repository' {
  if (explicitType && explicitType !== 'auto') {
    return explicitType as 'unit' | 'integration' | 'repository';
  }
  if (analysis.isRepository) return 'repository';
  if (analysis.isRoute || analysis.hasDatabase || analysis.hasExternalApi) return 'integration';
  return 'unit';
}

/**
 * Generate import path from file path
 */
export function generateImportPath(targetFile: string, testFile: string): string {
  const testDir = path.dirname(testFile);
  const relativePath = path.relative(testDir, targetFile);
  const withoutExt = relativePath.replace(/\.(ts|js)$/, '');
  return withoutExt + '.js';
}
