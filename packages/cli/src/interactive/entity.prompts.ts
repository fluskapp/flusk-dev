/**
 * Interactive prompts for entity creation
 * Uses inquirer.js for CLI interactions
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { toKebabCase } from '../generators/utils.js';

export interface FieldDefinition {
  name: string;
  type: 'String' | 'Integer' | 'Number' | 'Boolean' | 'UUID' | 'Date' | 'Email';
  required: boolean;
  unique: boolean;
  description?: string;
}

export interface EntityDefinition {
  name: string;
  fields: FieldDefinition[];
}

/**
 * Validate entity name (must be PascalCase)
 */
function validateEntityName(input: string): boolean | string {
  if (!input || input.trim().length === 0) {
    return 'Entity name is required';
  }

  // Check PascalCase (starts with uppercase, no spaces, no special chars except alphanumeric)
  const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/;
  if (!pascalCasePattern.test(input)) {
    return 'Entity name must be in PascalCase (e.g., User, LLMCall, OrderItem)';
  }

  return true;
}

/**
 * Validate field name (must be camelCase)
 */
function validateFieldName(input: string, existingFields: FieldDefinition[]): boolean | string {
  if (!input || input.trim().length === 0) {
    return 'Field name is required';
  }

  // Check camelCase (starts with lowercase, no spaces, no special chars except alphanumeric)
  const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
  if (!camelCasePattern.test(input)) {
    return 'Field name must be in camelCase (e.g., email, firstName, isActive)';
  }

  // Check for reserved keywords (TypeScript + SQL)
  const reservedKeywords = [
    'id', 'createdAt', 'updatedAt', // BaseEntity fields
    'class', 'const', 'enum', 'export', 'extends', 'import', 'super', 'this', // TypeScript
    'select', 'from', 'where', 'insert', 'update', 'delete', 'drop', 'create' // SQL
  ];

  if (reservedKeywords.includes(input.toLowerCase())) {
    return `"${input}" is a reserved keyword. Please choose a different name.`;
  }

  // Check for duplicate field names
  if (existingFields.some(f => f.name === input)) {
    return `Field "${input}" already exists. Please choose a different name.`;
  }

  return true;
}

/**
 * Check if entity file already exists
 */
function checkEntityExists(entityName: string): boolean {
  const entitiesDir = resolve(process.cwd(), 'packages/entities/src');
  const kebabName = toKebabCase(entityName);
  const fileName = `${kebabName}.entity.ts`;
  const filePath = resolve(entitiesDir, fileName);

  return existsSync(filePath);
}

/**
 * Prompt for entity name
 */
export async function promptEntityName(): Promise<string> {
  const { entityName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'entityName',
      message: chalk.blue('Entity name (PascalCase):'),
      validate: validateEntityName
    }
  ]);

  // Check if file exists
  if (checkEntityExists(entityName)) {
    console.log(chalk.yellow(`\n⚠️  Warning: Entity "${entityName}" already exists`));

    const { shouldOverwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldOverwrite',
        message: chalk.yellow('Overwrite existing entity file?'),
        default: false
      }
    ]);

    if (!shouldOverwrite) {
      console.log(chalk.red('\n❌ Entity creation cancelled'));
      process.exit(0);
    }
  }

  console.log(chalk.green(`✓ Entity name: ${entityName}\n`));
  return entityName;
}

/**
 * Prompt for field type
 */
export async function promptFieldType(): Promise<string> {
  const { fieldType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fieldType',
      message: chalk.blue('Add field type:'),
      choices: [
        { name: 'String', value: 'String' },
        { name: 'Number (Integer)', value: 'Integer' },
        { name: 'Number (Decimal)', value: 'Number' },
        { name: 'Boolean', value: 'Boolean' },
        { name: 'Date', value: 'Date' },
        { name: 'Email', value: 'Email' },
        { name: 'UUID', value: 'UUID' },
        new inquirer.Separator(),
        { name: chalk.green('Done adding fields'), value: 'Done' }
      ]
    }
  ]);

  return fieldType;
}

/**
 * Prompt for field details
 */
export async function promptFieldDetails(
  fieldType: string,
  existingFields: FieldDefinition[]
): Promise<FieldDefinition> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'fieldName',
      message: chalk.blue('Field name (camelCase):'),
      validate: (input: string) => validateFieldName(input, existingFields)
    },
    {
      type: 'confirm',
      name: 'required',
      message: chalk.blue('Required?'),
      default: true
    },
    {
      type: 'confirm',
      name: 'unique',
      message: chalk.blue('Unique?'),
      default: false
    }
  ]);

  const field: FieldDefinition = {
    name: answers.fieldName,
    type: fieldType as FieldDefinition['type'],
    required: answers.required,
    unique: answers.unique
  };

  // Show confirmation
  const attributes = [];
  if (field.required) attributes.push('required');
  if (field.unique) attributes.push('unique');
  const attributeStr = attributes.length > 0 ? `, ${attributes.join(', ')}` : '';

  console.log(chalk.green(`✓ Added field: ${field.name} (${field.type}${attributeStr})\n`));

  return field;
}

/**
 * Main interactive entity creation flow
 */
export async function createEntityInteractive(): Promise<EntityDefinition> {
  console.log(chalk.blue('\n🚀 Interactive Entity Creator\n'));

  // Step 1: Get entity name
  const entityName = await promptEntityName();

  // Step 2: Collect fields
  const fields: FieldDefinition[] = [];

  while (true) {
    const fieldType = await promptFieldType();

    if (fieldType === 'Done') {
      break;
    }

    const field = await promptFieldDetails(fieldType, fields);
    fields.push(field);
  }

  // Warn if no fields
  if (fields.length === 0) {
    console.log(chalk.yellow('⚠️  Warning: No fields added (entity will only have BaseEntity fields)\n'));
  }

  return {
    name: entityName,
    fields
  };
}
