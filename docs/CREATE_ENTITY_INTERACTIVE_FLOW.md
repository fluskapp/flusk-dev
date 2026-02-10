# `flusk create:entity` - Interactive Flow Design

**Version**: 1.0
**Date**: 2026-02-06
**Status**: Ready for Implementation

## Overview

This document provides the complete interactive flow design for `flusk create:entity`, ready for immediate implementation with inquirer.js.

---

## Complete Flow ASCII Mockup

```
$ flusk create:entity

📝 Interactive Entity Creator

Creating a new entity schema for Flusk...

? Entity name: (PascalCase, e.g., User, LlmCall) █
```

**User types: "User"**

```
? Entity name: User
✓ Entity name: User

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adding fields to User entity...

? Select field type: (Use arrow keys, Enter to select)
  ❯ String       (text, varchar)
    Number       (integer, float, decimal)
    Boolean      (true/false)
    Date         (timestamp, datetime)
    UUID         (unique identifier)
    Email        (validated email address)
    JSON         (structured data)
    Array        (list of values)
    ────────────────────────────────
    ✅ Done adding fields
```

**User selects: "Email"**

```
? Select field type: Email
? Field name: (camelCase, e.g., emailAddress, userEmail) █
```

**User types: "email"**

```
? Field name: email
? Is this field required? (Y/n) █
```

**User presses: Y**

```
? Is this field required? Yes
? Is this field unique? (Y/n) █
```

**User presses: Y**

```
? Is this field unique? Yes

✓ Added field: email (Email, required, unique)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Add another field? (Y/n) █
```

**User presses: Y (loop repeats)**

```
? Add another field? Yes

? Select field type: (Use arrow keys, Enter to select)
  ❯ String       (text, varchar)
    Number       (integer, float, decimal)
    Boolean      (true/false)
    Date         (timestamp, datetime)
    UUID         (unique identifier)
    Email        (validated email address)
    JSON         (structured data)
    Array        (list of values)
    ────────────────────────────────
    ✅ Done adding fields
```

**User selects: "String"**

```
? Select field type: String
? Field name: name
? Is this field required? (Y/n) Y
? Is this field required? Yes
? Is this field unique? (y/N) N
? Is this field unique? No
? Default value: (leave blank for none) █
```

**User leaves blank**

```
? Default value: (none)

✓ Added field: name (String, required)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Add another field? (y/N) N
? Add another field? No

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Entity Summary

Entity: User

Fields:
  • id          (UUID, required, unique)       [auto-generated]
  • email       (Email, required, unique)
  • name        (String, required)
  • createdAt   (Date, required)               [auto-generated]
  • updatedAt   (Date, required)               [auto-generated]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Generate entity file? (Y/n) █
```

**User presses: Y**

```
? Generate entity file? Yes

🔧 Generating entity schema...

✅ Created packages/entities/src/user.entity.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Entity created successfully!

💡 Next steps:
   flusk g user.entity.ts    # Generate code from entity
   flusk migrate             # Update database schema

```

---

## Implementation Specification

### 1. Prompt Sequence

**Order of prompts:**

1. **Entity name** (once)
2. **Field creation loop** (repeat until "Done"):
   - Field type selection
   - Field name
   - Is required?
   - Is unique? (if applicable)
   - Default value? (if applicable, optional)
3. **Add another field?** (Y/n)
4. **Entity summary** (display only)
5. **Generate entity file?** (Y/n confirmation)

### 2. Field Type Selection

**Use inquirer `list` type** (arrow key navigation):

```typescript
{
  type: 'list',
  name: 'fieldType',
  message: 'Select field type:',
  choices: [
    { name: 'String       (text, varchar)', value: 'string' },
    { name: 'Number       (integer, float, decimal)', value: 'number' },
    { name: 'Boolean      (true/false)', value: 'boolean' },
    { name: 'Date         (timestamp, datetime)', value: 'date' },
    { name: 'UUID         (unique identifier)', value: 'uuid' },
    { name: 'Email        (validated email address)', value: 'email' },
    { name: 'JSON         (structured data)', value: 'json' },
    { name: 'Array        (list of values)', value: 'array' },
    new inquirer.Separator(),
    { name: '✅ Done adding fields', value: 'done' },
  ],
}
```

**Type descriptions** (shown in UI):
- **String**: Text, varchar
- **Number**: Integer, float, decimal
- **Boolean**: true/false
- **Date**: Timestamp, datetime
- **UUID**: Unique identifier
- **Email**: Validated email address
- **JSON**: Structured data
- **Array**: List of values

### 3. Field Configuration Prompts

**For each field, ask in this order:**

```typescript
// 1. Field name
{
  type: 'input',
  name: 'fieldName',
  message: 'Field name:',
  default: '',
  validate: (input) => {
    if (!input) return 'Field name is required';
    if (!/^[a-z][a-zA-Z0-9]*$/.test(input)) {
      return 'Field name must be camelCase (e.g., emailAddress, userName)';
    }
    if (existingFields.includes(input)) {
      return `Field "${input}" already exists. Choose a different name.`;
    }
    return true;
  },
}

// 2. Is required?
{
  type: 'confirm',
  name: 'isRequired',
  message: 'Is this field required?',
  default: true,
}

// 3. Is unique? (for String, Email, UUID types only)
{
  type: 'confirm',
  name: 'isUnique',
  message: 'Is this field unique?',
  default: false,
  when: (answers) => ['string', 'email', 'uuid'].includes(answers.fieldType),
}

// 4. Default value? (optional, only if NOT required)
{
  type: 'input',
  name: 'defaultValue',
  message: 'Default value: (leave blank for none)',
  default: '',
  when: (answers) => !answers.isRequired,
}
```

**Field configuration matrix:**

| Field Type | Required? | Unique? | Default? |
|------------|-----------|---------|----------|
| String     | ✓         | ✓       | ✓        |
| Number     | ✓         | ✗       | ✓        |
| Boolean    | ✓         | ✗       | ✓        |
| Date       | ✓         | ✗       | ✗        |
| UUID       | ✓         | ✓       | ✗        |
| Email      | ✓         | ✓       | ✗        |
| JSON       | ✓         | ✗       | ✗        |
| Array      | ✓         | ✗       | ✗        |

### 4. Visual Formatting

**Color Coding:**

```typescript
import chalk from 'chalk';

const ui = {
  // Questions
  question: chalk.hex('#0066CC'),      // Blue for prompts

  // Success/Progress
  success: chalk.hex('#00CC66'),       // Green for success
  checkmark: chalk.hex('#00CC66')('✓'),

  // Info/Guidance
  info: chalk.hex('#FFAA00'),          // Yellow for info/tips
  tip: chalk.hex('#FFAA00')('💡'),

  // Sections
  header: chalk.bold.hex('#0066CC'),   // Blue headers
  separator: chalk.gray('━'.repeat(60)),

  // Errors
  error: chalk.hex('#CC0000'),         // Red for errors
};
```

**Progress Indicators:**

```typescript
// After each field is added
console.log(ui.checkmark + chalk.gray(` Added field: ${fieldName} (${fieldType}${required ? ', required' : ''}${unique ? ', unique' : ''})`));

// Section separators
console.log('\n' + ui.separator + '\n');

// Headers
console.log(ui.header('📝 Interactive Entity Creator'));
console.log(ui.header('📋 Entity Summary'));
```

**Field Summary Display:**

```typescript
console.log(ui.header('\n📋 Entity Summary\n'));
console.log(chalk.bold(`Entity: ${entityName}\n`));
console.log(chalk.bold('Fields:'));

fields.forEach(field => {
  const attrs = [];
  if (field.required) attrs.push('required');
  if (field.unique) attrs.push('unique');

  const autoGen = field.autoGenerated ? chalk.gray('[auto-generated]') : '';
  const attrStr = attrs.length > 0 ? `, ${attrs.join(', ')}` : '';

  console.log(chalk.gray(`  • ${field.name.padEnd(12)} (${field.type}${attrStr})`.padEnd(50)) + autoGen);
});
```

### 5. Error Handling

**Invalid Entity Name:**

```
? Entity name: user

❌ Error: Entity name must be PascalCase

Entity names should start with a capital letter and use PascalCase.

💡 Fix: Try "User" instead of "user"
   Other examples: LlmCall, ApiKey, UserSession

? Entity name: █
```

**Code:**
```typescript
{
  type: 'input',
  name: 'entityName',
  message: 'Entity name:',
  validate: (input) => {
    if (!input) {
      return chalk.hex('#CC0000')('Entity name is required');
    }
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
      console.log('\n' + chalk.hex('#CC0000')('❌ Error: Entity name must be PascalCase\n'));
      console.log('Entity names should start with a capital letter and use PascalCase.\n');
      console.log(chalk.hex('#FFAA00')('💡 Fix: Try "' + input.charAt(0).toUpperCase() + input.slice(1) + '" instead of "' + input + '"'));
      console.log(chalk.hex('#FFAA00')('   Other examples: LlmCall, ApiKey, UserSession\n'));
      return 'Please enter a PascalCase entity name';
    }
    return true;
  },
}
```

**Invalid Field Name:**

```
? Field name: Email

❌ Error: Field name must be camelCase

Field names should start with a lowercase letter and use camelCase.

💡 Fix: Try "email" instead of "Email"
   Other examples: emailAddress, userEmail, isActive

? Field name: █
```

**Code:**
```typescript
validate: (input) => {
  if (!input) {
    return chalk.hex('#CC0000')('Field name is required');
  }
  if (!/^[a-z][a-zA-Z0-9]*$/.test(input)) {
    console.log('\n' + chalk.hex('#CC0000')('❌ Error: Field name must be camelCase\n'));
    console.log('Field names should start with a lowercase letter and use camelCase.\n');
    console.log(chalk.hex('#FFAA00')('💡 Fix: Try "' + input.charAt(0).toLowerCase() + input.slice(1) + '" instead of "' + input + '"'));
    console.log(chalk.hex('#FFAA00')('   Other examples: emailAddress, userEmail, isActive\n'));
    return 'Please enter a camelCase field name';
  }
  return true;
}
```

**Duplicate Field Name:**

```
? Field name: email

❌ Error: Field "email" already exists

You've already added a field named "email" to this entity.

💡 Fix: Choose a different field name
   Suggestions: emailAddress, primaryEmail, contactEmail

? Field name: █
```

**Code:**
```typescript
validate: (input, answers) => {
  if (existingFields.includes(input)) {
    console.log('\n' + chalk.hex('#CC0000')(`❌ Error: Field "${input}" already exists\n`));
    console.log(`You've already added a field named "${input}" to this entity.\n`);
    console.log(chalk.hex('#FFAA00')('💡 Fix: Choose a different field name'));
    console.log(chalk.hex('#FFAA00')(`   Suggestions: ${input}Address, primary${input.charAt(0).toUpperCase() + input.slice(1)}, contact${input.charAt(0).toUpperCase() + input.slice(1)}\n`));
    return `Field "${input}" already exists`;
  }
  return true;
}
```

---

## Auto-Generated Fields

**Always include these fields automatically** (don't prompt):

```typescript
const autoFields = [
  {
    name: 'id',
    type: 'UUID',
    required: true,
    unique: true,
    autoGenerated: true,
  },
  {
    name: 'createdAt',
    type: 'Date',
    required: true,
    autoGenerated: true,
  },
  {
    name: 'updatedAt',
    type: 'Date',
    required: true,
    autoGenerated: true,
  },
];
```

Display these in the summary with `[auto-generated]` tag.

---

## Success Output

**After file generation:**

```typescript
console.log(chalk.hex('#0066CC')('🔧 Generating entity schema...\n'));

// Generate file...

console.log(chalk.hex('#00CC66')(`✅ Created packages/entities/src/${entityName.toLowerCase()}.entity.ts\n`));

console.log(ui.separator + '\n');

console.log(chalk.hex('#00CC66')('✨ Entity created successfully!\n'));

console.log(chalk.hex('#FFAA00')('💡 Next steps:'));
console.log(chalk.hex('#FFAA00')(`   flusk g ${entityName.toLowerCase()}.entity.ts    # Generate code from entity`));
console.log(chalk.hex('#FFAA00')('   flusk migrate             # Update database schema\n'));
```

---

## Complete Implementation Code Structure

```typescript
import inquirer from 'inquirer';
import chalk from 'chalk';

interface Field {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  defaultValue?: string;
  autoGenerated?: boolean;
}

export async function createEntityInteractive() {
  const ui = {
    question: chalk.hex('#0066CC'),
    success: chalk.hex('#00CC66'),
    info: chalk.hex('#FFAA00'),
    error: chalk.hex('#CC0000'),
    header: chalk.bold.hex('#0066CC'),
    separator: chalk.gray('━'.repeat(60)),
    checkmark: chalk.hex('#00CC66')('✓'),
    tip: chalk.hex('#FFAA00')('💡'),
  };

  // Header
  console.log('\n' + ui.header('📝 Interactive Entity Creator\n'));
  console.log('Creating a new entity schema for Flusk...\n');

  // 1. Entity name
  const { entityName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'entityName',
      message: 'Entity name:',
      validate: (input) => {
        if (!input) return ui.error('Entity name is required');
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
          console.log('\n' + ui.error('❌ Error: Entity name must be PascalCase\n'));
          console.log('Entity names should start with a capital letter and use PascalCase.\n');
          console.log(ui.info('💡 Fix: Try "' + input.charAt(0).toUpperCase() + input.slice(1) + '" instead of "' + input + '"'));
          console.log(ui.info('   Other examples: LlmCall, ApiKey, UserSession\n'));
          return 'Please enter a PascalCase entity name';
        }
        return true;
      },
    },
  ]);

  console.log(ui.checkmark + chalk.gray(` Entity name: ${entityName}\n`));
  console.log(ui.separator + '\n');

  // 2. Field creation loop
  const fields: Field[] = [];
  const existingFields: string[] = [];

  console.log(`Adding fields to ${entityName} entity...\n`);

  let addingFields = true;
  while (addingFields) {
    const { fieldType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'fieldType',
        message: 'Select field type:',
        choices: [
          { name: 'String       (text, varchar)', value: 'string' },
          { name: 'Number       (integer, float, decimal)', value: 'number' },
          { name: 'Boolean      (true/false)', value: 'boolean' },
          { name: 'Date         (timestamp, datetime)', value: 'date' },
          { name: 'UUID         (unique identifier)', value: 'uuid' },
          { name: 'Email        (validated email address)', value: 'email' },
          { name: 'JSON         (structured data)', value: 'json' },
          { name: 'Array        (list of values)', value: 'array' },
          new inquirer.Separator(),
          { name: '✅ Done adding fields', value: 'done' },
        ],
      },
    ]);

    if (fieldType === 'done') {
      addingFields = false;
      break;
    }

    // Field configuration
    const fieldConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'fieldName',
        message: 'Field name:',
        validate: (input) => {
          if (!input) return ui.error('Field name is required');
          if (!/^[a-z][a-zA-Z0-9]*$/.test(input)) {
            console.log('\n' + ui.error('❌ Error: Field name must be camelCase\n'));
            console.log('Field names should start with a lowercase letter and use camelCase.\n');
            console.log(ui.info('💡 Fix: Try "' + input.charAt(0).toLowerCase() + input.slice(1) + '" instead of "' + input + '"'));
            console.log(ui.info('   Other examples: emailAddress, userName, isActive\n'));
            return 'Please enter a camelCase field name';
          }
          if (existingFields.includes(input)) {
            console.log('\n' + ui.error(`❌ Error: Field "${input}" already exists\n`));
            console.log(`You've already added a field named "${input}" to this entity.\n`);
            console.log(ui.info('💡 Fix: Choose a different field name\n'));
            return `Field "${input}" already exists`;
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'isRequired',
        message: 'Is this field required?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'isUnique',
        message: 'Is this field unique?',
        default: false,
        when: () => ['string', 'email', 'uuid'].includes(fieldType),
      },
      {
        type: 'input',
        name: 'defaultValue',
        message: 'Default value: (leave blank for none)',
        default: '',
        when: (answers) => !answers.isRequired,
      },
    ]);

    const field: Field = {
      name: fieldConfig.fieldName,
      type: fieldType,
      required: fieldConfig.isRequired,
      unique: fieldConfig.isUnique,
      defaultValue: fieldConfig.defaultValue || undefined,
    };

    fields.push(field);
    existingFields.push(field.name);

    const attrs = [];
    if (field.required) attrs.push('required');
    if (field.unique) attrs.push('unique');
    const attrStr = attrs.length > 0 ? `, ${attrs.join(', ')}` : '';

    console.log(ui.checkmark + chalk.gray(` Added field: ${field.name} (${fieldType}${attrStr})\n`));
    console.log(ui.separator + '\n');

    const { addAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Add another field?',
        default: false,
      },
    ]);

    if (!addAnother) {
      addingFields = false;
    } else {
      console.log('');
    }
  }

  // 3. Display summary
  console.log('\n' + ui.header('📋 Entity Summary\n'));
  console.log(chalk.bold(`Entity: ${entityName}\n`));
  console.log(chalk.bold('Fields:'));

  // Auto-generated fields
  const allFields = [
    { name: 'id', type: 'UUID', required: true, unique: true, autoGenerated: true },
    ...fields,
    { name: 'createdAt', type: 'Date', required: true, autoGenerated: true },
    { name: 'updatedAt', type: 'Date', required: true, autoGenerated: true },
  ];

  allFields.forEach((field) => {
    const attrs = [];
    if (field.required) attrs.push('required');
    if (field.unique) attrs.push('unique');
    const attrStr = attrs.length > 0 ? `, ${attrs.join(', ')}` : '';
    const autoGen = field.autoGenerated ? chalk.gray('[auto-generated]') : '';

    console.log(
      chalk.gray(`  • ${field.name.padEnd(12)} (${field.type}${attrStr})`.padEnd(50)) + autoGen
    );
  });

  console.log('\n' + ui.separator + '\n');

  // 4. Confirm generation
  const { generateFile } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'generateFile',
      message: 'Generate entity file?',
      default: true,
    },
  ]);

  if (!generateFile) {
    console.log(chalk.gray('\nEntity creation cancelled.\n'));
    return;
  }

  // 5. Generate file
  console.log('\n' + ui.question('🔧 Generating entity schema...\n'));

  const entityFilePath = `packages/entities/src/${entityName.toLowerCase()}.entity.ts`;

  // TODO: Actual file generation logic here
  await generateEntityFile(entityName, fields);

  console.log(ui.success(`✅ Created ${entityFilePath}\n`));
  console.log(ui.separator + '\n');
  console.log(ui.success('✨ Entity created successfully!\n'));
  console.log(ui.tip + ' Next steps:');
  console.log(ui.info(`   flusk g ${entityName.toLowerCase()}.entity.ts    # Generate code from entity`));
  console.log(ui.info('   flusk migrate             # Update database schema\n'));
}

async function generateEntityFile(entityName: string, fields: Field[]) {
  // Implementation: Generate TypeBox schema and write to file
  // This will be implemented by backend engineer
}
```

---

## Ready for Implementation

This document provides everything the frontend engineer needs:

✅ Complete ASCII mockup
✅ Exact prompt sequence
✅ inquirer.js configuration
✅ Color coding with hex values
✅ Error handling with examples
✅ Success output format
✅ Complete implementation code structure

**Status**: Ready for immediate implementation!
