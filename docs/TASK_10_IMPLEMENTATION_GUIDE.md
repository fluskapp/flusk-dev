# Task #10 Implementation Guide - Validation Commands

**Owner**: Backend Engineer (to be assigned)
**Estimate**: 45-60 minutes
**Priority**: Critical (last major feature before code review)

---

## Quick Overview

**Goal**: Implement 3 validation commands to catch errors early:
1. `flusk validate:schema` - Validate entity schemas
2. `flusk validate:structure` - Validate project structure
3. `flusk validate:config` - Validate configurations

---

## What Already Exists

**✅ Schema Validator (Partial)**:
- `/packages/cli/src/validators/schema.validator.ts` exists
- May need enhancement/completion

**❌ Missing**:
- `src/validators/structure.validator.ts`
- `src/validators/config.validator.ts`
- `src/commands/validate/` directory
- `src/commands/validate/schema.ts`
- `src/commands/validate/structure.ts`
- `src/commands/validate/config.ts`
- `src/commands/validate/index.ts` (parent command)

---

## Implementation Steps

### Step 1: Review Existing Schema Validator (5 min)

**Read**:
```bash
cat /Users/user/projects/flusk/packages/cli/src/validators/schema.validator.ts
```

**Check if it has**:
- TypeBox schema syntax validation
- Field type validation
- Required field checks
- Constraint validation

**If incomplete**, enhance it. If complete, move to Step 2.

---

### Step 2: Create Structure Validator (15-20 min)

**Create**: `src/validators/structure.validator.ts`

**Validation Logic**:

```typescript
import { existsSync } from 'fs';
import { join } from 'path';

export interface StructureValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProjectStructure(
  projectRoot: string
): StructureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check packages/ folder exists
  if (!existsSync(join(projectRoot, 'packages'))) {
    errors.push('packages/ folder not found');
  }

  // Check required packages
  const requiredPackages = ['entities', 'types', 'resources', 'business-logic', 'execution'];
  for (const pkg of requiredPackages) {
    const pkgPath = join(projectRoot, 'packages', pkg);
    if (!existsSync(pkgPath)) {
      errors.push(`Required package not found: packages/${pkg}`);
    } else {
      // Check src/ folder exists in package
      if (!existsSync(join(pkgPath, 'src'))) {
        errors.push(`src/ folder missing in packages/${pkg}`);
      }
    }
  }

  // Check for orphaned files
  // TODO: Implement orphaned file detection

  // Validate import paths
  // TODO: Implement import path validation

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

**Test it**:
```typescript
// src/validators/structure.validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateProjectStructure } from './structure.validator';

describe('Structure Validator', () => {
  it('validates correct project structure', () => {
    const result = validateProjectStructure(process.cwd());
    expect(result.valid).toBe(true);
  });

  it('detects missing packages', () => {
    const result = validateProjectStructure('/tmp/nonexistent');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('packages/ folder not found');
  });
});
```

---

### Step 3: Create Config Validator (15-20 min)

**Create**: `src/validators/config.validator.ts`

**Validation Logic**:

```typescript
import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvFile(
  projectRoot: string
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const envPath = join(projectRoot, '.env');
  const examplePath = join(projectRoot, '.env.example');

  // Check .env.example exists
  if (!existsSync(examplePath)) {
    errors.push('.env.example file not found');
    return { valid: false, errors, warnings };
  }

  // Parse .env.example
  const exampleVars = parseEnvFile(examplePath);

  // Check .env exists
  if (!existsSync(envPath)) {
    warnings.push('.env file not found - run "flusk env:setup"');
    return { valid: true, errors, warnings };
  }

  // Parse .env
  const envVars = parseEnvFile(envPath);

  // Check for missing required variables
  for (const key of Object.keys(exampleVars)) {
    if (!(key in envVars)) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateDockerCompose(
  projectRoot: string
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const composePath = join(projectRoot, 'docker-compose.yml');

  if (!existsSync(composePath)) {
    errors.push('docker-compose.yml not found');
    return { valid: false, errors, warnings };
  }

  try {
    const content = readFileSync(composePath, 'utf-8');
    const parsed = parseYaml(content);

    // Check version
    if (!parsed.version) {
      warnings.push('docker-compose.yml missing version field');
    }

    // Check services
    if (!parsed.services) {
      errors.push('docker-compose.yml missing services');
    } else {
      // Check for PostgreSQL
      if (!parsed.services.postgres && !parsed.services.postgresql) {
        warnings.push('PostgreSQL service not found in docker-compose.yml');
      }

      // Check for Redis
      if (!parsed.services.redis) {
        warnings.push('Redis service not found in docker-compose.yml');
      }
    }
  } catch (error) {
    errors.push(`Invalid YAML syntax in docker-compose.yml: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateWattConfig(
  projectRoot: string
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const wattPath = join(projectRoot, 'watt.json');

  if (!existsSync(wattPath)) {
    errors.push('watt.json not found');
    return { valid: false, errors, warnings };
  }

  try {
    const content = readFileSync(wattPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Basic validation
    if (!parsed.$schema) {
      warnings.push('watt.json missing $schema field');
    }

    if (!parsed.services) {
      errors.push('watt.json missing services configuration');
    }
  } catch (error) {
    errors.push(`Invalid JSON syntax in watt.json: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8');
  const vars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
  }

  return vars;
}
```

---

### Step 4: Create Validate Commands (10-15 min)

**Create directory**:
```bash
mkdir -p /Users/user/projects/flusk/packages/cli/src/commands/validate
```

**Create**: `src/commands/validate/schema.ts`

```typescript
import { Command } from 'commander';
import { validateEntitySchema } from '../../validators/schema.validator.js';
import { formatSuccess, formatError, formatWarning } from '../../utils/ui.js';

export const schemaCommand = new Command('schema')
  .description('Validate entity schemas')
  .argument('[file]', 'Entity file to validate (or validate all if not specified)')
  .action(async (file?: string) => {
    try {
      const result = file
        ? validateEntitySchema(file)
        : validateAllSchemas();

      if (result.valid) {
        console.log(formatSuccess('✓ All schemas valid'));
      } else {
        for (const error of result.errors) {
          console.log(formatError(error));
        }
        for (const warning of result.warnings) {
          console.log(formatWarning(warning));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(formatError(`Validation failed: ${error.message}`));
      process.exit(1);
    }
  });
```

**Create**: `src/commands/validate/structure.ts`

```typescript
import { Command } from 'commander';
import { validateProjectStructure } from '../../validators/structure.validator.js';
import { formatSuccess, formatError, formatWarning } from '../../utils/ui.js';

export const structureCommand = new Command('structure')
  .description('Validate project structure')
  .action(async () => {
    try {
      const result = validateProjectStructure(process.cwd());

      if (result.valid) {
        console.log(formatSuccess('✓ Project structure valid'));
      } else {
        for (const error of result.errors) {
          console.log(formatError(error));
        }
        for (const warning of result.warnings) {
          console.log(formatWarning(warning));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(formatError(`Validation failed: ${error.message}`));
      process.exit(1);
    }
  });
```

**Create**: `src/commands/validate/config.ts`

```typescript
import { Command } from 'commander';
import {
  validateEnvFile,
  validateDockerCompose,
  validateWattConfig
} from '../../validators/config.validator.js';
import { formatSuccess, formatError, formatWarning } from '../../utils/ui.js';

export const configCommand = new Command('config')
  .description('Validate configurations (.env, docker-compose.yml, watt.json)')
  .action(async () => {
    try {
      const results = [
        { name: '.env', result: validateEnvFile(process.cwd()) },
        { name: 'docker-compose.yml', result: validateDockerCompose(process.cwd()) },
        { name: 'watt.json', result: validateWattConfig(process.cwd()) }
      ];

      let allValid = true;

      for (const { name, result } of results) {
        if (result.valid) {
          console.log(formatSuccess(`✓ ${name} valid`));
        } else {
          allValid = false;
          console.log(formatError(`✗ ${name} invalid`));
          for (const error of result.errors) {
            console.log(formatError(`  ${error}`));
          }
        }

        for (const warning of result.warnings) {
          console.log(formatWarning(`  ${warning}`));
        }
      }

      if (!allValid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(formatError(`Validation failed: ${error.message}`));
      process.exit(1);
    }
  });
```

**Create**: `src/commands/validate/index.ts`

```typescript
import { Command } from 'commander';
import { schemaCommand } from './schema.js';
import { structureCommand } from './structure.js';
import { configCommand } from './config.js';

export const validateCommand = new Command('validate')
  .description('Validate schemas, structure, and configurations')
  .addCommand(schemaCommand)
  .addCommand(structureCommand)
  .addCommand(configCommand);
```

---

### Step 5: Register Validate Command (2 min)

**Edit**: `/packages/cli/bin/flusk.ts`

**Add import**:
```typescript
import { validateCommand } from '../src/commands/validate/index.js';
```

**Add command**:
```typescript
program.addCommand(validateCommand);
```

---

### Step 6: Test (5-10 min)

**Build**:
```bash
cd /Users/user/projects/flusk/packages/cli
pnpm build
```

**Test commands**:
```bash
# Test schema validation
node dist/bin/flusk.js validate:schema

# Test structure validation
node dist/bin/flusk.js validate:structure

# Test config validation
node dist/bin/flusk.js validate:config
```

**Expected output**:
- ✓ Success messages (green)
- ✗ Error messages (red) if issues found
- Warnings (yellow) if applicable

---

## UI Utilities Available

**Use these for output**:

```typescript
import {
  formatSuccess,  // Green checkmark + message
  formatError,    // Red X + error message
  formatWarning,  // Yellow warning triangle + message
  createSpinner   // Loading spinner
} from '../../utils/ui.js';
```

**Example**:
```typescript
const spinner = createSpinner('Validating schemas...');
// ... validation logic ...
if (valid) {
  spinner.succeed('All schemas valid');
} else {
  spinner.fail('Validation failed');
}
```

---

## Architecture Compliance

**Follow these patterns** (from CLI_ARCHITECTURE.md):

1. **Commands** → Delegate to validators (no validation logic in commands)
2. **Validators** → Pure functions (return results, no console output)
3. **UI utilities** → Handle all output formatting
4. **Error handling** → Clear, actionable error messages

---

## Testing Checklist

- [ ] TypeScript compilation successful
- [ ] All three validators work
- [ ] All three commands work
- [ ] Error messages clear and actionable
- [ ] Success messages displayed correctly
- [ ] Warnings displayed correctly
- [ ] Exit codes correct (0 success, 1 error)
- [ ] UI utilities used correctly
- [ ] Unit tests added (optional but recommended)

---

## Dependencies Needed

**Check if these are already in package.json**:

```json
{
  "dependencies": {
    "yaml": "^2.3.0"  // For docker-compose.yml parsing
  }
}
```

**If missing, add**:
```bash
pnpm add yaml
pnpm add -D @types/js-yaml
```

---

## Reference Files

**Check these for patterns**:

1. **Existing validator**: `src/validators/schema.validator.ts`
2. **Existing commands**: `src/commands/infra/*.ts`
3. **UI utilities**: `src/utils/ui.ts`
4. **Architecture**: `/docs/CLI_ARCHITECTURE.md` (ADR #6)

---

## Estimated Time Breakdown

- Step 1 (Review existing): 5 min
- Step 2 (Structure validator): 15-20 min
- Step 3 (Config validator): 15-20 min
- Step 4 (Commands): 10-15 min
- Step 5 (Register): 2 min
- Step 6 (Test): 5-10 min

**Total**: 45-60 minutes

---

## Success Criteria

✅ **Task complete when**:

1. All three validators implemented
2. All three commands work
3. TypeScript compilation successful
4. Commands registered in `bin/flusk.ts`
5. Output uses UI utilities (colors, formatting)
6. Error messages actionable
7. Manual testing successful

---

## Need Help?

- Check `/docs/CLI_ARCHITECTURE.md` for patterns
- Check `/docs/CLI_UX_SPECIFICATION.md` for output formatting
- Check existing commands in `src/commands/infra/` for examples
- Message team-lead if blocked

---

**Last Updated**: 2026-02-06 21:20
**Status**: Ready for implementation
**Priority**: Critical (blocking final code review)
