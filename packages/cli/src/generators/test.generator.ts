/**
 * Test Generator
 * Analyzes source files and generates comprehensive test files
 */

import fs from 'fs/promises';
import path from 'path';
import { generateUnitTestTemplate } from '../templates/test/unit-test.template.js';
import { generateIntegrationTestTemplate } from '../templates/test/integration-test.template.js';
import { generateRepositoryTestTemplate } from '../templates/test/repository-test.template.js';

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

interface FileAnalysis {
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
async function analyzeSourceFile(filePath: string): Promise<FileAnalysis> {
  const content = await fs.readFile(filePath, 'utf-8');

  const analysis: FileAnalysis = {
    functions: [],
    classes: [],
    isRepository: false,
    isRoute: false,
    hasDatabase: false,
    hasExternalApi: false,
  };

  // Detect exported functions
  const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    analysis.functions.push(match[1]);
  }

  // Detect exported classes
  const classRegex = /export\s+class\s+(\w+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    analysis.classes.push(match[1]);
  }

  // Detect repository pattern
  if (filePath.includes('repository') || filePath.includes('repositories')) {
    analysis.isRepository = true;
  }

  // Detect route pattern
  if (filePath.includes('route') || filePath.includes('routes')) {
    analysis.isRoute = true;

    // Try to detect endpoint and method
    const routeRegex = /\.(\w+)\s*\(\s*['"`]([^'"`]+)['"`]/;
    const routeMatch = content.match(routeRegex);
    if (routeMatch) {
      analysis.method = routeMatch[1].toUpperCase();
      analysis.endpoint = routeMatch[2];
    }
  }

  // Detect database usage
  if (content.includes('knex') || content.includes('db.') || content.includes('transaction')) {
    analysis.hasDatabase = true;
  }

  // Detect external API calls
  if (content.includes('axios') || content.includes('fetch') || content.includes('http')) {
    analysis.hasExternalApi = true;
  }

  return analysis;
}

/**
 * Determine test type based on file analysis
 */
function determineTestType(analysis: FileAnalysis, explicitType?: string): 'unit' | 'integration' | 'repository' {
  if (explicitType && explicitType !== 'auto') {
    return explicitType as 'unit' | 'integration' | 'repository';
  }

  if (analysis.isRepository) {
    return 'repository';
  }

  if (analysis.isRoute || analysis.hasDatabase || analysis.hasExternalApi) {
    return 'integration';
  }

  return 'unit';
}

/**
 * Generate import path from file path
 */
function generateImportPath(targetFile: string, testFile: string): string {
  const targetDir = path.dirname(targetFile);
  const testDir = path.dirname(testFile);
  const relativePath = path.relative(testDir, targetFile);

  // Remove extension and add .js for ESM
  const withoutExt = relativePath.replace(/\.(ts|js)$/, '');
  return withoutExt + '.js';
}

/**
 * Generate test file content based on analysis
 */
function generateTestContent(
  analysis: FileAnalysis,
  testType: 'unit' | 'integration' | 'repository',
  fileName: string,
  importPath: string
): string {
  switch (testType) {
    case 'repository': {
      const className = analysis.classes[0] || 'Repository';
      const entityName = className.replace(/Repository$/, '');
      return generateRepositoryTestTemplate({
        fileName,
        importPath,
        className,
        entityName,
      });
    }

    case 'integration': {
      return generateIntegrationTestTemplate({
        fileName,
        importPath,
        endpoint: analysis.endpoint,
        method: analysis.method,
        hasDatabase: analysis.hasDatabase,
        hasExternalApi: analysis.hasExternalApi,
      });
    }

    case 'unit':
    default: {
      return generateUnitTestTemplate({
        fileName,
        importPath,
        functions: analysis.functions,
        classes: analysis.classes,
      });
    }
  }
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
  } catch (error) {
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
