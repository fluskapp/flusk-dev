# Flusk CLI User Experience Specification

**Version**: 1.1 (Updated with Brand Guidelines)
**Date**: 2026-02-06
**Status**: Ready for Implementation

## Executive Summary

This document defines the user experience design for the Flusk CLI, establishing patterns, principles, and implementation guidelines for creating a professional, helpful, and accessible command-line interface for LLM API optimization.

**Brand Personality**: Expert Assistant (Professional, Informative, Helpful)
**Inspiration**: GitHub CLI, Stripe CLI, Vercel CLI

---

## 1. Design Philosophy

### 1.1 Brand Personality: Expert Assistant

**Professional Infrastructure Tool**

Flusk is a professional infrastructure tool for reducing LLM costs. The CLI personality follows the GitHub CLI and Stripe CLI model - professional and informative, but genuinely helpful.

**Tone Guidelines:**
- ✅ **Professional**: Clear, precise, technical when needed
- ✅ **Helpful**: Proactive suggestions, error recovery guidance
- ✅ **Informative**: Explain what's happening and why
- ❌ **Not playful**: Avoid casual language, jokes, or excessive emoji
- ❌ **Not terse**: Provide context and explanation, not just facts
- ❌ **Not condescending**: Respect developer expertise

**Reference CLIs:**
- **GitHub CLI (`gh`)** - Professional, clear communication style
- **Stripe CLI** - Excellent error messages with actionable fixes
- **Vercel CLI** - Great progress indicators and step-by-step feedback

### 1.2 Core Principles

**Principle 1: Guided Intelligence**
- The CLI understands project context and proactively suggests next steps
- Smart defaults reduce cognitive load
- Context-aware help and suggestions

**Principle 2: Progressive Disclosure**
- Start simple, reveal complexity only when needed
- Essential information first, details on demand
- Layered help system (brief → detailed → examples)

**Principle 3: Automatic Fix Suggestions**
- Show what's wrong AND provide the exact command to fix it
- Errors include both explanation and solution
- Always provide actionable next steps
- Example: "❌ Error: X not found" + "💡 Fix: run this command"

**Principle 4: Smart Formatting**
- **Tables** for data lists (dependencies, entities, migrations)
- **Trees** for hierarchical structure (file systems, relationships)
- **Boxen** for important messages (warnings, summaries)
- **Color coding** for semantic meaning (not decoration)

**Principle 5: Accessibility First**
- Screen reader compatible (WCAG 2.1 Level AA)
- Keyboard-only navigation
- Graceful degradation for limited terminals
- NO_COLOR environment variable support

---

## 2. Visual Design System

### 2.1 Color Palette

**Flusk Brand Colors** (Official):
```typescript
const fluskColors = {
  // Brand Primary Colors
  primary: '#0066CC',    // Blue - Info, headers, primary actions
  success: '#00CC66',    // Green - Success states
  warning: '#FFAA00',    // Yellow - Warnings, attention needed
  error: '#CC0000',      // Red - Errors, failures
};
```

**Chalk Implementation**:
```typescript
import chalk from 'chalk';

const ui = {
  // Semantic colors (aligned with brand)
  info: chalk.hex('#0066CC'),       // Blue - Info, headers
  success: chalk.hex('#00CC66'),    // Green - Success
  warning: chalk.hex('#FFAA00'),    // Yellow - Warnings
  error: chalk.hex('#CC0000'),      // Red - Errors

  // State colors
  pending: chalk.gray,              // Gray - Pending tasks
  inProgress: chalk.hex('#0066CC'), // Blue - In progress
  completed: chalk.hex('#00CC66'),  // Green - Completed

  // Hierarchy
  header: chalk.bold.hex('#0066CC'),     // Headers, commands
  subheader: chalk.hex('#0066CC'),       // Subheadings
  filename: chalk.cyan,                  // Filenames, paths
  muted: chalk.dim,                      // Less important info

  // Utility
  highlight: chalk.bold.hex('#FFAA00'),  // Important callouts
  code: chalk.cyan,                      // Code snippets
};
```

**Color Usage Guidelines**:
- **Blue (#0066CC)**: Primary color for info, headers, progress
- **Green (#00CC66)**: Success messages, completed tasks, checkmarks
- **Yellow (#FFAA00)**: Warnings, attention needed, suggestions
- **Red (#CC0000)**: Errors, failures, critical issues
- Use sparingly - color supports meaning, doesn't create it

**Accessibility Requirements**:
- Support `NO_COLOR` environment variable (graceful degradation)
- Minimum 4.5:1 contrast ratio for all text (WCAG 2.1 Level AA)
- Never use color as the only indicator (always pair with text/symbols)
- Test with common color blindness types (deuteranopia, protanopia)

### 2.2 Typography & Spacing

**Hierarchy Rules**:
```
[LEVEL 1: Section Header]
Bold + Underline, blank line before/after

[LEVEL 2: Subsection]
Bold, blank line before

[LEVEL 3: Item]
Normal weight, indent 2 spaces

[LEVEL 4: Detail]
Dim, indent 4 spaces
```

**Example**:
```
🚀 Initializing Flusk Project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project Structure
  ✅ packages/entities
  ✅ packages/types
  ✅ packages/resources
      Generated 12 files

Dependencies
  Installing @sinclair/typebox...
  Installing fastify...
```

### 2.3 Icons & Symbols

**Status Indicators**:
- ✅ Success / Completed
- ❌ Error / Failed
- ⚠️  Warning / Attention needed
- ℹ️  Information
- ⏳ In progress / Pending
- 💡 Suggestion / Tip
- 🔧 Tool / Action
- 📦 Package / Module
- 🗄️  Database
- 🐳 Docker / Infrastructure
- 🚀 Initialization / Launch
- ✨ Completion / Success message

**Accessibility Note**: Always pair emoji with text label for screen readers.

### 2.4 Smart Formatting Patterns

**Philosophy**: Use the right format for the data type (Team Guideline):
- **Tables** for data lists (dependencies, entities, migrations)
- **Trees** for hierarchical structure (file systems, relationships)
- **Boxen** for important messages (warnings, summaries, welcome)
- **Color coding** for semantic meaning (green=success, yellow=warning, red=error, blue=info)

---

**Pattern 1: Tables (Using cli-table3)**

Use for: Data lists, comparisons, status overviews

```typescript
import Table from 'cli-table3';

const table = new Table({
  head: [chalk.blue('Entity'), chalk.blue('Status'), chalk.blue('Files')],
  style: { head: [], border: [] }
});

table.push(
  ['User', chalk.green('✅ Generated'), '4'],
  ['LlmCall', chalk.yellow('⏳ Pending'), '0'],
  ['ApiKey', chalk.green('✅ Generated'), '4']
);

console.log(table.toString());
```

**Visual Result**:
```
┌─────────┬──────────────┬───────┐
│ Entity  │ Status       │ Files │
├─────────┼──────────────┼───────┤
│ User    │ ✅ Generated │ 4     │
│ LlmCall │ ⏳ Pending   │ 0     │
│ ApiKey  │ ✅ Generated │ 4     │
└─────────┴──────────────┴───────┘
```

---

**Pattern 2: Trees (Manual formatting)**

Use for: File systems, hierarchical relationships, generated code structure

```typescript
// Simple tree rendering
function showTree(entity: string, files: string[]) {
  console.log(chalk.cyan(`📦 ${entity}`));
  files.forEach((file, i) => {
    const isLast = i === files.length - 1;
    const prefix = isLast ? '└─' : '├─';
    console.log(chalk.green(`  ${prefix} ✅ ${file}`));
  });
}
```

**Visual Result**:
```
📦 user.entity.ts
  ├─ ✅ types/user.types.ts
  ├─ ✅ resources/user.repository.ts
  ├─ ✅ business-logic/validate-user.ts
  └─ ✅ execution/routes/user.routes.ts
```

---

**Pattern 3: Boxen (Using boxen package)**

Use for: Welcome messages, warnings, important summaries

```typescript
import boxen from 'boxen';

const welcomeMessage = boxen(
  chalk.bold.blue('Flusk - LLM API Optimization Platform\n\n') +
  'Initialize your project with intelligent code generation\n' +
  'and infrastructure setup.',
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue',
  }
);

console.log(welcomeMessage);
```

**Visual Result**:
```
╭──────────────────────────────────────────────╮
│                                              │
│   Flusk - LLM API Optimization Platform     │
│                                              │
│   Initialize your project with intelligent  │
│   code generation and infrastructure setup. │
│                                              │
╰──────────────────────────────────────────────╯
```

---

**Pattern 4: Color-Coded Lists**

Use for: Step-by-step progress, status indicators

```
Creating project structure...
  ✅ Generated .gitignore
  ✅ Generated docker-compose.yml
  ⏳ Installing dependencies (2/5)
  ⏹️  Setting up database
  ⏹️  Running migrations
```

**When to Use Each Format**:
- **Table**: Multiple entities with properties (entity list, migration status, test coverage)
- **Tree**: Parent-child relationships (generated files, directory structure)
- **Boxen**: One-time important messages (welcome, critical warnings, completion summary)
- **List**: Sequential progress (installation steps, build process)

---

## 3. Interaction Patterns

### 3.1 Command Output Flow

**Standard Success Flow**:
```
[Command invocation]
[Action header with icon]
[Progress indicators]
[Results with checkmarks]
[Summary message]
[Optional: Next steps suggestion]
```

**Example**:
```bash
$ flusk g user.entity.ts

🔧 Generating code from user.entity.ts

Processing entity schema...
  ✅ packages/types/src/user.types.ts
  ✅ packages/resources/src/user.repository.ts
  ✅ packages/business-logic/src/validate-user.ts
  ✅ packages/execution/src/routes/user.routes.ts

✨ Code generation complete! (4 files created)

💡 Next: Run 'flusk migrate' to update the database
```

### 3.2 Interactive Prompts

**Using Inquirer.js**:

**Pattern: Entity Creation**
```typescript
const questions = [
  {
    type: 'input',
    name: 'entityName',
    message: 'Entity name:',
    validate: (input) => input.match(/^[A-Z][a-zA-Z]+$/)
      ? true
      : 'Entity name must be PascalCase (e.g., User, LlmCall)',
  },
  {
    type: 'list',
    name: 'fieldType',
    message: 'Add field type:',
    choices: [
      { name: '📝 Text (string)', value: 'string' },
      { name: '🔢 Number (integer/float)', value: 'number' },
      { name: '✓  Boolean (true/false)', value: 'boolean' },
      { name: '📅 Date (timestamp)', value: 'date' },
      { name: '🆔 UUID (unique identifier)', value: 'uuid' },
      { name: '📧 Email (validated string)', value: 'email' },
      new inquirer.Separator(),
      { name: '✅ Done adding fields', value: 'done' },
    ],
  },
];
```

**Visual Result**:
```
? Entity name: User
? Add field type: (Use arrow keys)
  📝 Text (string)
  🔢 Number (integer/float)
  ✓  Boolean (true/false)
❯ 📅 Date (timestamp)
  🆔 UUID (unique identifier)
  📧 Email (validated string)
  ─────────────────
  ✅ Done adding fields
```

### 3.3 Progress Indicators

**Philosophy**: Step-by-step feedback. Show each sub-task as it completes (not just start/end).

**Using Ora for Step-by-Step Progress**:

**Pattern: Infrastructure Startup** (Team Guideline Example):
```typescript
// Show each service as it becomes ready
console.log(chalk.blue('🐳 Starting infrastructure...\n'));

const pgSpinner = ora('PostgreSQL 16').start();
await startPostgres();
pgSpinner.succeed('PostgreSQL 16 ready on localhost:5432');

const redisSpinner = ora('Redis 7').start();
await startRedis();
redisSpinner.succeed('Redis 7 ready on localhost:6379');

const adminerSpinner = ora('Adminer (DB UI)').start();
await startAdminer();
adminerSpinner.succeed('Adminer ready on http://localhost:8080');

console.log(chalk.green('\n✨ Infrastructure started successfully!\n'));
```

**Visual Result** (Following Team Guidelines):
```
🐳 Starting infrastructure...

✅ PostgreSQL 16 ready on localhost:5432
✅ Redis 7 ready on localhost:6379
✅ Adminer ready on http://localhost:8080

✨ Infrastructure started successfully!
```

**Pattern: File Generation**:
```typescript
console.log(chalk.blue('🔧 Generating code from user.entity.ts\n'));

console.log('Processing entity schema...');
const files = await generateFiles();

for (const file of files) {
  console.log(chalk.green(`  ✅ ${file.path}`));
}

console.log(chalk.green('\n✨ Code generation complete! (4 files created)\n'));
```

**Visual Result**:
```
🔧 Generating code from user.entity.ts

Processing entity schema...
  ✅ packages/types/src/user.types.ts
  ✅ packages/resources/src/user.repository.ts
  ✅ packages/business-logic/src/validate-user.ts
  ✅ packages/execution/src/routes/user.routes.ts

✨ Code generation complete! (4 files created)
```

**Key Principles**:
1. **Show each step**: Don't hide progress behind generic "Processing..."
2. **Immediate feedback**: Show checkmark as soon as each sub-task completes
3. **Clear completion**: End with summary message
4. **Informative**: Include URLs, ports, file counts in success messages

---

## 4. Error Handling & Recovery

**Philosophy**: Show what's wrong AND provide the exact command to fix it. Inspired by Stripe CLI's excellent error messages.

### 4.1 Error Message Format

**Template** (Following Team Guidelines):
```
❌ Error: [Brief description]

[Detailed explanation of what went wrong]

💡 Fix: [Exact command to run]
   [Additional instructions if needed]
```

**Real-World Examples**:

**Example 1: Missing Environment File**
```
❌ Error: DATABASE_URL not found in .env

Flusk needs database connection details to run migrations.

💡 Fix: cp .env.example .env
   Then edit .env and add your database URL
```

**Example 2: Infrastructure Not Running**
```
❌ Error: Cannot connect to PostgreSQL on localhost:5432

Database connection refused. Infrastructure may not be started.

💡 Fix: flusk infra:up
   This will start PostgreSQL, Redis, and related services
```

**Example 3: Missing Dependencies**
```
❌ Error: Module '@sinclair/typebox' not found

Project dependencies are not installed.

💡 Fix: npm install
   Run from the project root directory
```

**Example 4: Invalid Entity Schema**
```
❌ Error: Invalid TypeBox schema in user.entity.ts

Missing required import statement on line 1.

💡 Fix: Add this line at the top of user.entity.ts:
   import { Type } from '@sinclair/typebox'
```

**Key Principles**:
1. **Be specific**: Tell exactly what failed and why
2. **Provide fix**: Give the exact command to run
3. **Add context**: Explain what will happen when they run the fix
4. **Professional tone**: Helpful but not condescending

### 4.2 Interactive Error Recovery

**Pattern: Offer Automated Fixes**
```typescript
async function handleMissingEnv() {
  console.log(chalk.red('❌ Missing .env file\n'));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'How would you like to fix this?',
    choices: [
      { name: '🔧 Generate .env from template', value: 'generate' },
      { name: '👀 Show .env.example', value: 'show' },
      { name: '📖 Open documentation', value: 'docs' },
      { name: '❌ Exit', value: 'exit' },
    ],
  }]);

  switch (action) {
    case 'generate':
      // Auto-generate .env
      break;
    case 'show':
      // Display .env.example
      break;
    case 'docs':
      // Open browser to docs
      break;
  }
}
```

**Visual Result**:
```
❌ Missing .env file

? How would you like to fix this?
❯ 🔧 Generate .env from template
  👀 Show .env.example
  📖 Open documentation
  ❌ Exit
```

### 4.3 Validation Errors

**Schema Validation Example**:
```
❌ VALIDATION ERROR: Invalid entity schema

packages/entities/src/user.entity.ts

  Line 12: Missing required field 'Type'
  ┌─────────────────────────────────────
  │ 10 | export const UserEntity = Type.Object({
  │ 11 |   id: Type.String({ format: 'uuid' }),
  │ 12 |   email: Type.String(),  ← Missing Type import
  │    |          ^^^^^^^^^^^^^
  └─────────────────────────────────────

  Expected: import { Type } from '@sinclair/typebox'

Fix: Add import statement at the top of the file
```

---

## 5. Command-Specific UX Patterns

### 5.1 `flusk init` - Project Initialization

**Flow**:
1. Welcome message with branding
2. Prompt for project name (if not provided)
3. Show what will be created
4. Confirmation prompt
5. Step-by-step progress
6. Success summary with next steps

**Visual Design**:
```
╔════════════════════════════════════════════╗
║  🚀 Flusk - LLM API Optimization Platform  ║
╚════════════════════════════════════════════╝

? Project name: my-api-project
? Project directory: ./my-api-project (auto-detected)

This will create:
  ✓ Project structure (packages/entities, types, resources, etc.)
  ✓ Infrastructure (docker-compose.yml for PostgreSQL + Redis)
  ✓ Configuration (.gitignore, .env.example, watt.json)
  ✓ Dependencies (TypeScript, Fastify, TypeBox, etc.)

? Continue? (Y/n)

🔧 Initializing my-api-project...

Creating project structure...
  ✅ packages/entities
  ✅ packages/types
  ✅ packages/resources
  ✅ packages/business-logic
  ✅ packages/execution

Generating configuration files...
  ✅ .gitignore
  ✅ docker-compose.yml
  ✅ .env.example
  ✅ watt.json
  ✅ package.json

Installing dependencies...
  ⠋ @sinclair/typebox
  ✅ fastify (5.2.0)
  ✅ pg (8.13.1)
  ⠋ typescript (5.7.0)

✨ Project initialized successfully!

Next steps:
  cd my-api-project
  cp .env.example .env
  flusk infra:up
  flusk create:entity

Need help? Run 'flusk --help'
```

### 5.2 `flusk create:entity` - Interactive Entity Creation

**Flow**:
1. Welcome message
2. Entity name prompt
3. Field creation loop (type → name → validation)
4. Relationship prompts (optional)
5. Summary preview
6. Generate entity file
7. Suggest next command

**Visual Design**:
```
📝 Interactive Entity Creator

? Entity name: User

Adding fields to User entity...

? Field type: (Use arrow keys)
❯ 📝 Text
  🔢 Number
  ✓  Boolean
  📅 Date
  📧 Email
  🆔 UUID
  ─────────
  ✅ Done

? Field name: email
? Required? Yes
? Unique? Yes

Field added: email (Email, required, unique)

? Add another field? (Y/n)

───────────────────────────────────────

Entity Summary: User
  ✓ id (UUID, required, unique)
  ✓ email (Email, required, unique)
  ✓ createdAt (Date, required)

? Generate entity file? (Y/n)

✅ Generated packages/entities/src/user.entity.ts

💡 Next: Run 'flusk g user.entity.ts' to generate code
```

### 5.3 `flusk infra:up` - Infrastructure Management

**Flow**:
1. Pre-flight checks (Docker running?)
2. Show what will be started
3. Start services with progress
4. Health checks
5. Display access URLs
6. Connection strings

**Visual Design**:
```
🐳 Starting Flusk Infrastructure

Pre-flight checks...
  ✅ Docker is running
  ✅ Ports 5432, 6379, 8080 available
  ⚠️  Existing containers found (will be restarted)

Starting services...
  ⠋ PostgreSQL 16 + pgvector
  ⏹️  Redis 7
  ⏹️  Adminer (DB UI)
  ⏹️  RedisInsight (Redis UI)

PostgreSQL 16 + pgvector
  ⠋ Pulling image (if needed)
  ⠋ Starting container
  ⠋ Waiting for ready state
  ✅ Ready on localhost:5432

Redis 7
  ✅ Ready on localhost:6379

Adminer (DB UI)
  ✅ Ready on http://localhost:8080

RedisInsight (Redis UI)
  ✅ Ready on http://localhost:8001

✨ Infrastructure started successfully!

Connection strings:
  DATABASE_URL=postgresql://flusk:secret@localhost:5432/flusk
  REDIS_URL=redis://localhost:6379

Manage UIs:
  Database: http://localhost:8080
  Redis:    http://localhost:8001

💡 Next: Run 'flusk migrate' to set up database schema
```

### 5.4 `flusk g` - Code Generation

**Flow**:
1. Validate entity file exists
2. Show generation plan
3. Generate files with progress
4. Display created files
5. Suggest next steps (tests, migration)

**Visual Design**:
```
🔧 Generating code from user.entity.ts

Analyzing entity schema...
  ✅ Entity: User
  ✅ Fields: 3 (id, email, createdAt)
  ✅ Relations: 0

Generation plan:
  → types/user.types.ts (TypeScript interfaces)
  → resources/user.repository.ts (Database repository)
  → business-logic/validate-user.ts (Validation functions)
  → execution/routes/user.routes.ts (Fastify routes)

Generating files...
  ✅ packages/types/src/user.types.ts (287 bytes)
  ✅ packages/resources/src/repositories/user.repository.ts (1.2 KB)
  ✅ packages/business-logic/src/validators/validate-user.ts (456 bytes)
  ✅ packages/execution/src/routes/user.routes.ts (892 bytes)

✨ Generation complete! (4 files, 2.8 KB total)

📦 Generated files:
packages/
  ├─ types/src/user.types.ts
  ├─ resources/src/repositories/user.repository.ts
  ├─ business-logic/src/validators/validate-user.ts
  └─ execution/src/routes/user.routes.ts

💡 Next steps:
  flusk migrate                    # Update database
  flusk g:test user.repository.ts  # Generate tests
```

---

## 6. Accessibility Guidelines

### 6.1 Screen Reader Compatibility

**Requirements**:
1. **Status-first messages**: Lead with status word
   ```
   // Good
   SUCCESS: User entity created
   ERROR: Database connection failed

   // Bad (visual only)
   ✅ User entity created
   ❌ Database connection failed
   ```

2. **Semantic structure**: Use clear hierarchy
   ```
   // Good
   Section: Creating project structure
   Item: Generated .gitignore
   Item: Generated docker-compose.yml

   // Bad (flat)
   Creating project structure
   Generated .gitignore
   Generated docker-compose.yml
   ```

3. **Descriptive labels**: Never use emoji alone
   ```
   // Good
   ✅ SUCCESS: Migration completed

   // Bad
   ✅ (no text)
   ```

### 6.2 Keyboard Navigation

**Requirements**:
1. Single-key shortcuts for common actions (Y/N, 1-9)
2. Arrow keys for menu navigation
3. Ctrl+C always allows graceful exit
4. Tab completion for commands and file paths
5. Enter confirms default option

**Example**:
```
? Continue? (Y/n)
  [Y] Yes (default)
  [N] No

Press Y or N, or Enter for default
```

### 6.3 Terminal Compatibility

**Graceful Degradation**:
```typescript
// Detect terminal capabilities
const supportsColor = chalk.level > 0;
const supportsUnicode = process.env.LANG?.includes('UTF-8');

// Fallback for limited terminals
const spinner = supportsUnicode ? '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏' : '|/-\\';
const checkmark = supportsUnicode ? '✅' : '[OK]';
const crossmark = supportsUnicode ? '❌' : '[ERROR]';
```

**NO_COLOR Support**:
```typescript
// Respect NO_COLOR environment variable
if (process.env.NO_COLOR) {
  chalk.level = 0;
}
```

---

## 7. Implementation Checklist

### 7.1 Dependencies to Add

```json
{
  "dependencies": {
    "chalk": "^5.4.1",        // ✅ Already installed
    "commander": "^12.1.0",   // ✅ Already installed
    "inquirer": "^9.2.0",     // ❌ Need to add
    "ora": "^8.0.0",          // ❌ Need to add
    "boxen": "^7.1.0",        // ❌ Need to add (for boxes)
    "cli-table3": "^0.6.3",   // ❌ Need to add (for tables)
    "log-update": "^6.0.0",   // ❌ Need to add (for live updates)
    "figures": "^6.0.0"       // ❌ Need to add (for symbols)
  }
}
```

### 7.2 Utility Functions to Create

**Location**: `packages/cli/src/utils/ui.ts`

```typescript
// Color scheme
export const ui = {
  success: (msg: string) => chalk.green(`✅ ${msg}`),
  error: (msg: string) => chalk.red(`❌ ${msg}`),
  warning: (msg: string) => chalk.yellow(`⚠️  ${msg}`),
  info: (msg: string) => chalk.blue(`ℹ️  ${msg}`),
  tip: (msg: string) => chalk.cyan(`💡 ${msg}`),
};

// Section headers
export function header(title: string): void {
  console.log('\n' + chalk.bold.blue(title));
  console.log(chalk.blue('─'.repeat(title.length)));
}

// Progress tree
export function progressTree(items: ProgressItem[]): void {
  // Implementation
}

// Error with recovery
export async function errorWithRecovery(
  error: Error,
  solutions: Solution[]
): Promise<void> {
  // Implementation
}
```

### 7.3 Testing Requirements

**Visual Regression Tests**:
- Capture terminal output for each command
- Compare against baseline snapshots
- Test with and without color support
- Test with and without Unicode support

**Accessibility Tests**:
- Verify screen reader compatibility
- Test keyboard-only navigation
- Validate NO_COLOR support
- Check contrast ratios

**Example Test**:
```typescript
describe('flusk init', () => {
  it('shows proper visual hierarchy', () => {
    const output = captureOutput(() => {
      runCommand('init', 'test-project');
    });

    expect(output).toMatchSnapshot();
    expect(output).toContainProperHeaders();
    expect(output).toContainStatusIndicators();
  });

  it('works without color', () => {
    process.env.NO_COLOR = '1';
    const output = captureOutput(() => {
      runCommand('init', 'test-project');
    });

    expect(output).not.toContainAnsiCodes();
  });
});
```

---

## 8. Success Criteria

### 8.1 Developer Experience Metrics

**Quantitative**:
- First-time users can initialize project in < 2 minutes
- Error messages lead to successful resolution > 80% of time
- Interactive prompts have < 5 second response time
- CLI help is consulted < 10% of the time (intuitive defaults)

**Qualitative**:
- Developers describe CLI as "helpful" and "clear"
- Error messages feel like guidance, not blame
- Visual output is easy to scan
- Accessibility needs are met

### 8.2 Accessibility Compliance

- ✅ WCAG 2.1 Level AA contrast (4.5:1 minimum)
- ✅ Screen reader compatible (tested with VoiceOver/NVDA)
- ✅ Keyboard-only navigation (no mouse required)
- ✅ NO_COLOR environment variable supported
- ✅ Terminal compatibility (basic terminals work)

---

## 9. Future Enhancements

### 9.1 Phase 2 Features

**AI-Powered Suggestions**:
```
$ flusk ai:suggest

Analyzing your project...

💡 Suggestions:
  [1] Entity 'User' has no tests (create with flusk g:test)
  [2] Migration pending for 'LlmCall' entity
  [3] Redis cache not configured (.env missing REDIS_URL)

Apply suggestion [1-3] or [A]ll:
```

**Visual Dashboards**:
```
┌─────────── Flusk Project Status ───────────┐
│                                             │
│ Entities:    5 defined, 4 migrated         │
│ Tests:       78% coverage                  │
│ Infra:       ✅ Running (PostgreSQL, Redis) │
│ Last Deploy: 2 hours ago                   │
│                                             │
│ [R]efresh  [D]etails  [Q]uit               │
└─────────────────────────────────────────────┘
```

### 9.2 Power User Features

**Command Aliases**:
```bash
# Short aliases
flusk i    # init
flusk c:e  # create:entity
flusk g    # generate
```

**Configuration File**:
```json
// .fluskrc
{
  "ui": {
    "verbosity": "normal",  // quiet | normal | verbose
    "color": true,
    "unicode": true,
    "progress": "detailed"  // minimal | normal | detailed
  },
  "defaults": {
    "author": "Your Name",
    "license": "MIT"
  }
}
```

---

## 10. Appendix

### 10.1 Color Palette Reference

**Terminal Colors (Chalk)**:
- Red: `#E06C75` (errors)
- Green: `#98C379` (success)
- Yellow: `#E5C07B` (warnings)
- Blue: `#61AFEF` (info)
- Cyan: `#56B6C2` (in-progress)
- Gray: `#5C6370` (muted)

### 10.2 Emoji Reference

| Emoji | Meaning | Usage |
|-------|---------|-------|
| ✅ | Success | Completed tasks |
| ❌ | Error | Failed tasks |
| ⚠️ | Warning | Caution needed |
| ℹ️ | Info | Informational |
| ⏳ | Pending | Waiting/queued |
| 💡 | Tip | Suggestions |
| 🔧 | Tool | Actions |
| 📦 | Package | Modules |
| 🗄️ | Database | DB operations |
| 🐳 | Docker | Infrastructure |
| 🚀 | Launch | Initialization |
| ✨ | Complete | Success finale |

### 10.3 Example Commands Reference

```bash
# Project lifecycle
flusk init my-project
flusk create:entity
flusk g user.entity.ts
flusk migrate
flusk infra:up
flusk infra:down

# Code generation
flusk g:service auth
flusk g:middleware rate-limit
flusk g:test user.repository.ts

# Validation
flusk validate:schema
flusk validate:structure

# Documentation
flusk docs:api
```

---

**Document Status**: Ready for team review
**Next Steps**:
1. Team feedback on design patterns
2. Implementation of `ui.ts` utilities
3. Create component library for common patterns
4. Build prototype for `flusk init` command
