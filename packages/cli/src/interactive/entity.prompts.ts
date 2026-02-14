/** @generated —
 * Interactive prompts for entity creation
 * Uses inquirer.js for CLI interactions
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { validateEntityName, validateFieldName, checkEntityExists } from './entity-validators.js';
import type { FieldDefinition, EntityDefinition } from './entity-validators.js';

export type { FieldDefinition, EntityDefinition } from './entity-validators.js';

/**
 * Prompt for entity name
 */
export async function promptEntityName(): Promise<string> {
  const { entityName } = await inquirer.prompt([{
    type: 'input',
    name: 'entityName',
    message: chalk.blue('Entity name (PascalCase):'),
    validate: validateEntityName
  }]);

  if (checkEntityExists(entityName)) {
    console.log(chalk.yellow(`\n⚠️  Warning: Entity "${entityName}" already exists`));
    const { shouldOverwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'shouldOverwrite',
      message: chalk.yellow('Overwrite existing entity file?'),
      default: false
    }]);
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
  const { fieldType } = await inquirer.prompt([{
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
  }]);
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
    { type: 'confirm', name: 'required', message: chalk.blue('Required?'), default: true },
    { type: 'confirm', name: 'unique', message: chalk.blue('Unique?'), default: false }
  ]);

  const field: FieldDefinition = {
    name: answers.fieldName,
    type: fieldType as FieldDefinition['type'],
    required: answers.required,
    unique: answers.unique
  };

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
  const entityName = await promptEntityName();
  const fields: FieldDefinition[] = [];

  while (true) {
    const fieldType = await promptFieldType();
    if (fieldType === 'Done') break;
    const field = await promptFieldDetails(fieldType, fields);
    fields.push(field);
  }

  if (fields.length === 0) {
    console.log(chalk.yellow('⚠️  Warning: No fields added (entity will only have BaseEntity fields)\n'));
  }

  return { name: entityName, fields };
}
