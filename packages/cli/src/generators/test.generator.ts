/**
 * Test Generator
 * Analyzes source files and generates comprehensive test files
 */

import fs from 'fs/promises';
import path from 'path';
import {
  analyzeSourceFile,
  determineTestType,
  generateImportPath,
} from './test-generator.helpers.js';
import { generateTestContent } from './test-content.generator.js';

export interface GeneratorResult {
  filePath: string;
  content: string;
  created: boolean;
}

export interface TestGeneratorOptions {
  targetFile: string;
  testType?: 'unit' | 'integration' | 'repository' | 'auto';
  outputDir?: string;
}

/**
 * Generate test file for target source file
 */
export async function generateTest(options: TestGeneratorOptions): Promise<GeneratorResult[]> {
  const { targetFile, testType = 'auto', outputDir } = options;
  const results: GeneratorResult[] = [];

  try {
    // Verify target file exists
    await fs.access(targetFile);
  } catch (_error) {
    throw new Error(`Target file not found: ${targetFile}`);
  }

  // Analyze source file
  const analysis = await analyzeSourceFile(targetFile);

  // Determine test type
  const detectedTestType = determineTestType(analysis, testType);

  // Generate test file path
  const fileName = path.basename(targetFile, path.extname(targetFile));
  const testFileName = `${fileName}.test.ts`;

  let testFilePath: string;
  if (outputDir) {
    testFilePath = path.join(outputDir, testFileName);
  } else {
    // Place test file next to source file
    testFilePath = path.join(path.dirname(targetFile), testFileName);
  }

  // Generate import path
  const importPath = generateImportPath(targetFile, testFilePath);

  // Generate test content
  const content = generateTestContent(analysis, detectedTestType, fileName, importPath);

  // Check if test file already exists
  let fileExists = false;
  try {
    await fs.access(testFilePath);
    fileExists = true;
  } catch {
    // File doesn't exist, which is fine
  }

  if (fileExists) {
    throw new Error(`Test file already exists: ${testFilePath}\nUse --force to overwrite`);
  }

  // Create test file
  await fs.writeFile(testFilePath, content, 'utf-8');

  results.push({
    filePath: testFilePath,
    content,
    created: true,
  });

  return results;
}
