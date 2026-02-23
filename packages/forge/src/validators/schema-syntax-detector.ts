/**
 * Syntax error detection for schema files
 */

import type { ValidationError } from './config-validator.types.js';

/**
 * Detect common syntax errors (unmatched braces, parens, brackets)
 */
export function detectSyntaxErrors(
  content: string,
  file: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push({
      file,
      message: `Unmatched braces: ${openBraces} opening, ${closeBraces} closing`,
      fix: 'Balance braces in the schema definition',
    });
  }

  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push({
      file,
      message: `Unmatched parentheses: ${openParens} opening, ${closeParens} closing`,
      fix: 'Balance parentheses in Type definitions',
    });
  }

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
