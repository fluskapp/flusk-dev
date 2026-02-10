/**
 * Schema validator - validates TypeBox entity schemas
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  message: string;
  fix?: string;
}

export interface ValidationWarning {
  file: string;
  message: string;
}

const VALID_TYPEBOX_TYPES = [
  'String',
  'Number',
  'Integer',
  'Boolean',
  'Array',
  'Object',
  'Null',
  'Any',
  'Unknown',
  'Date',
  'Literal',
  'Union',
  'Intersect',
  'Tuple',
  'Record',
  'Partial',
  'Required',
  'Pick',
  'Omit',
  'Composite',
  'Optional',
  'Readonly',
  'Ref',
  'Uuid',
  'Email',
  'Url',
];

const RESERVED_KEYWORDS = [
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield'
];

/**
 * Validate all entity schemas in the project
 */
export async function validateSchemas(projectRoot: string = process.cwd()): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const entitiesDir = resolve(projectRoot, 'packages/entities/src');

  // Check if entities directory exists
  if (!existsSync(entitiesDir)) {
    result.valid = false;
    result.errors.push({
      file: 'packages/entities/src',
      message: 'Entities directory not found',
      fix: 'Create the directory: mkdir -p packages/entities/src',
    });
    return result;
  }

  // Find all entity files
  const files = readdirSync(entitiesDir)
    .filter(f => f.endsWith('.entity.ts') && f !== 'base.entity.ts');

  if (files.length === 0) {
    result.warnings.push({
      file: entitiesDir,
      message: 'No entity files found',
    });
    return result;
  }

  // Validate each entity file
  for (const file of files) {
    const filePath = resolve(entitiesDir, file);

    if (!existsSync(filePath)) {
      result.valid = false;
      result.errors.push({
        file,
        message: 'Entity file not found',
      });
      continue;
    }

    // Read and validate file content
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileResult = validateSchemaContent(content, file);

      result.errors.push(...fileResult.errors);
      result.warnings.push(...fileResult.warnings);

      if (!fileResult.valid) {
        result.valid = false;
      }
    } catch (error) {
      result.valid = false;
      result.errors.push({
        file,
        message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return result;
}

/**
 * Validate schema content
 */
function validateSchemaContent(content: string, file: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check for TypeBox import
  if (!content.includes('@sinclair/typebox')) {
    result.valid = false;
    result.errors.push({
      file,
      message: 'Missing TypeBox import',
      fix: 'Add: import { Type } from "@sinclair/typebox";',
    });
  }

  // Check for schema export
  const hasExport = /export\s+const\s+\w+Schema\s*=/g.test(content);
  if (!hasExport) {
    result.valid = false;
    result.errors.push({
      file,
      message: 'Missing schema export',
      fix: 'Add: export const EntityNameSchema = Type.Object({...});',
    });
  }

  // Validate TypeBox types used
  const typeMatches = content.matchAll(/Type\.(\w+)/g);
  for (const match of typeMatches) {
    const typeUsed = match[1];
    if (!VALID_TYPEBOX_TYPES.includes(typeUsed)) {
      result.valid = false;
      result.errors.push({
        file,
        message: `Invalid TypeBox type: Type.${typeUsed}`,
        fix: `Valid types: ${VALID_TYPEBOX_TYPES.join(', ')}`,
      });
    }
  }

  // Check for syntax errors
  const syntaxErrors = detectSyntaxErrors(content, file);
  if (syntaxErrors.length > 0) {
    result.valid = false;
    result.errors.push(...syntaxErrors);
  }

  // Check for reserved keywords in field names
  const fieldMatches = content.matchAll(/(\w+):\s*Type\./g);
  for (const match of fieldMatches) {
    const fieldName = match[1];
    if (RESERVED_KEYWORDS.includes(fieldName)) {
      result.valid = false;
      result.errors.push({
        file,
        message: `Field name "${fieldName}" is a reserved keyword`,
        fix: `Rename field to "${fieldName}_field" or use a different name`,
      });
    }
  }

  // Check for TypeScript type export
  if (!content.includes('type ') || !content.includes('Static<typeof')) {
    result.warnings.push({
      file,
      message: 'Missing TypeScript type export',
    });
  }

  return result;
}

/**
 * Detect common syntax errors
 */
function detectSyntaxErrors(content: string, file: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for unmatched braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push({
      file,
      message: `Unmatched braces: ${openBraces} opening, ${closeBraces} closing`,
      fix: 'Balance braces in the schema definition',
    });
  }

  // Check for unmatched parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push({
      file,
      message: `Unmatched parentheses: ${openParens} opening, ${closeParens} closing`,
      fix: 'Balance parentheses in Type definitions',
    });
  }

  // Check for unmatched brackets
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push({
      file,
      message: `Unmatched brackets: ${openBrackets} opening, ${closeBrackets} closing`,
      fix: 'Balance brackets in array definitions',
    });
  }

  return errors;
}
