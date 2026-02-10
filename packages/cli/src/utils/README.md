# Flusk CLI UI Utilities

Consistent, accessible UI components for Flusk CLI commands following the UX Specification v1.1.

## Quick Start

```typescript
import {
  ui,
  icons,
  formatSuccess,
  formatError,
  formatErrorWithFix,
  header,
  formatTree,
  formatStepProgress,
  formatNextSteps,
} from './utils/ui.js';

// Success message
console.log(formatSuccess('Migration completed'));
// ✅ Migration completed

// Error with fix
console.log(formatErrorWithFix(
  'DATABASE_URL not found',
  'cp .env.example .env'
));
// ❌ Error: DATABASE_URL not found
// 💡 Fix: cp .env.example .env
```

## Brand Colors

Official Flusk brand palette:

```typescript
import { colors, ui } from './utils/ui.js';

console.log(ui.info('Information'));      // #0066CC (Blue)
console.log(ui.success('Success'));       // #00CC66 (Green)
console.log(ui.warning('Warning'));       // #FFAA00 (Yellow)
console.log(ui.error('Error'));           // #CC0000 (Red)
```

## Message Formatters

### Basic Messages

```typescript
formatSuccess('Operation completed')
// ✅ Operation completed

formatError('Operation failed')
// ❌ Operation failed

formatWarning('Deprecated feature')
// ⚠️  Deprecated feature

formatInfo('Starting process')
// ℹ️  Starting process

formatTip('Run flusk migrate')
// 💡 Run flusk migrate
```

### Error with Fix (Stripe CLI Style)

```typescript
formatErrorWithFix(
  'DATABASE_URL not found in .env',
  'cp .env.example .env',
  'Then edit .env and add your database URL'
)
```

**Output:**
```
❌ Error: DATABASE_URL not found in .env

💡 Fix: cp .env.example .env
   Then edit .env and add your database URL
```

### Validation Errors

```typescript
formatValidationError(
  'packages/entities/src/user.entity.ts',
  12,
  'Missing required import',
  'Add import { Type } from "@sinclair/typebox"'
)
```

## Layout Components

### Headers

```typescript
header('Generating Code', icons.tool)
// 🔧 Generating Code
// ━━━━━━━━━━━━━━━━━━

header('Starting Infrastructure', icons.docker)
// 🐳 Starting Infrastructure
// ━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Separators

```typescript
separator()
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

separator(30)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Indentation

```typescript
indent('Nested item', 1)
//   Nested item

indent('Deeply nested', 2)
//     Deeply nested
```

## Progress Display

### File Tree

```typescript
formatTree('user.entity.ts', [
  { path: 'types/user.types.ts', status: 'success' },
  { path: 'resources/user.repository.ts', status: 'success' },
  { path: 'business-logic/validate-user.ts', status: 'pending' },
  { path: 'execution/routes/user.routes.ts', status: 'error' },
])
```

**Output:**
```
📦 user.entity.ts
  ├─ ✅ types/user.types.ts
  ├─ ✅ resources/user.repository.ts
  ├─ ⏳ business-logic/validate-user.ts
  └─ ❌ execution/routes/user.routes.ts
```

### Step-by-Step Progress

```typescript
formatStepProgress([
  { label: 'PostgreSQL 16', status: 'success', detail: 'localhost:5432' },
  { label: 'Redis 7', status: 'success', detail: 'localhost:6379' },
  { label: 'Adminer', status: 'pending' },
  { label: 'RedisInsight', status: 'skipped' },
])
```

**Output:**
```
✅ PostgreSQL 16 (localhost:5432)
✅ Redis 7 (localhost:6379)
⏳ Adminer
⏹️  RedisInsight
```

## Next Steps Section

```typescript
formatNextSteps([
  'flusk g user.entity.ts    # Generate code',
  'flusk migrate             # Update database',
])
```

**Output:**
```
💡 Next steps:
   flusk g user.entity.ts    # Generate code
   flusk migrate             # Update database
```

## Spinners

```typescript
import { createSpinner, withSpinner } from './utils/ui.js';

// Manual spinner control
const spinner = createSpinner('Installing dependencies');
spinner.start();
await installDeps();
spinner.succeed('Dependencies installed');

// Automatic spinner with async task
await withSpinner(
  'Starting infrastructure',
  async () => {
    await startInfrastructure();
  },
  'Infrastructure started successfully'
);
```

## Complete Command Example

```typescript
import {
  ui,
  icons,
  header,
  formatSuccess,
  formatTree,
  formatNextSteps,
} from './utils/ui.js';

// Header
console.log('\n' + header('Generating Code', icons.tool) + '\n');

// Processing message
console.log('Processing entity schema...');

// File tree
console.log(formatTree('user.entity.ts', [
  { path: 'types/user.types.ts', status: 'success' },
  { path: 'resources/user.repository.ts', status: 'success' },
  { path: 'business-logic/validate-user.ts', status: 'success' },
  { path: 'execution/routes/user.routes.ts', status: 'success' },
]));

console.log('');

// Success message
console.log(formatSuccess('✨ Code generation complete! (4 files created)'));

// Next steps
console.log(formatNextSteps([
  'flusk migrate             # Update database',
  'flusk g:test user.repository.ts  # Generate tests',
]));

console.log('');
```

**Output:**
```
🔧 Generating Code
━━━━━━━━━━━━━━━━━━

Processing entity schema...
📦 user.entity.ts
  ├─ ✅ types/user.types.ts
  ├─ ✅ resources/user.repository.ts
  ├─ ✅ business-logic/validate-user.ts
  └─ ✅ execution/routes/user.routes.ts

✅ ✨ Code generation complete! (4 files created)

💡 Next steps:
   flusk migrate             # Update database
   flusk g:test user.repository.ts  # Generate tests
```

## Accessibility

### NO_COLOR Support

```typescript
import { shouldDisableColors, optionalColor, ui } from './utils/ui.js';

if (shouldDisableColors()) {
  console.log('Success'); // Plain text
} else {
  console.log(ui.success('Success')); // Colored
}

// Automatic handling
console.log(optionalColor('Success', ui.success));
```

### Strip Colors

```typescript
import { stripColors } from './utils/ui.js';

const colored = ui.success('Success message');
const plain = stripColors(colored);
// plain = "Success message" (no ANSI codes)
```

## Icons Reference

```typescript
import { icons } from './utils/ui.js';

icons.success    // ✅
icons.error      // ❌
icons.warning    // ⚠️
icons.info       // ℹ️
icons.pending    // ⏳
icons.tip        // 💡
icons.tool       // 🔧
icons.package    // 📦
icons.database   // 🗄️
icons.docker     // 🐳
icons.launch     // 🚀
icons.complete   // ✨
```

## Testing

Run tests:
```bash
npm test
```

View visual examples:
```bash
node --import=tsx src/utils/ui.test.ts
```

## Reference

- **UX Specification**: `/docs/CLI_UX_SPECIFICATION.md`
- **Interactive Flow**: `/docs/CREATE_ENTITY_INTERACTIVE_FLOW.md`
- **Brand Colors**: Section 2.1 of UX Specification
- **Error Patterns**: Section 4 of UX Specification
- **Progress Patterns**: Section 3.3 of UX Specification
