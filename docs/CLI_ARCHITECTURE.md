# Flusk CLI Architecture Design

**Version**: 1.0
**Date**: 2026-02-06
**Author**: Software Architect
**Status**: Approved for Implementation

---

## Executive Summary

This document defines the architecture for the enhanced Flusk CLI, designed to support intelligent code generation, infrastructure setup, and project scaffolding. The architecture maintains the existing composable monolith pattern while adding interactive prompts, infrastructure management, and validation capabilities.

**Key Principles**:
1. **Schema-First**: Entity schemas are source of truth
2. **Layered Architecture**: Commands → Generators → Templates
3. **Pure Functions**: Generators have no side effects
4. **Fail-Fast Validation**: Validate before generation
5. **Developer Experience**: Beautiful output, clear errors

---

## System Context

### External Actors
- **Developers**: Primary users executing CLI commands
- **Docker**: Infrastructure provider for PostgreSQL + Redis
- **pnpm**: Package manager for workspace management
- **Git**: Version control integration

### System Responsibilities
- Project initialization with complete infrastructure
- Code generation from TypeBox entity schemas
- Infrastructure lifecycle management
- Interactive entity/component creation
- Project structure and schema validation

### External Dependencies
- Docker (required for infrastructure)
- Node.js 22+ (runtime)
- pnpm (workspace management)
- PostgreSQL 16 (via Docker)
- Redis 7 (via Docker)

---

## Architecture Overview

### Five-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│         Commands Layer (User Interface)        │
│  Entry points: init, generate, create, infra   │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│    Generators Layer (Business Logic)           │
│  Transforms schemas → code, configs → files    │
└─────────────────────────────────────────────────┘
                       ↓
┌──────────────────┬──────────────┬───────────────┐
│  Templates       │ Interactive  │  Validators   │
│  Code templates  │ Prompts      │  Validation   │
└──────────────────┴──────────────┴───────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│           Utils Layer (Helpers)                 │
│  File system, Docker, Git, Naming, Logger       │
└─────────────────────────────────────────────────┘
```

---

## Component Structure

### 1. Commands Layer

**Purpose**: Entry points for user interactions, orchestrate generators

```typescript
src/commands/
├── init/                    # NEW - Project initialization
│   └── init.command.ts      # flusk init [project-name]
├── generate/                # EXISTING - Code generation
│   └── generate.command.ts  # flusk g [entity-file]
├── migrate/                 # EXISTING - Database migrations
│   └── migrate.command.ts   # flusk migrate
├── create/                  # NEW - Interactive creators
│   ├── entity.command.ts    # flusk create:entity
│   ├── service.command.ts   # flusk create:service <name>
│   └── middleware.command.ts# flusk create:middleware <name>
├── infra/                   # NEW - Infrastructure management
│   ├── up.command.ts        # flusk infra:up
│   ├── down.command.ts      # flusk infra:down
│   ├── reset.command.ts     # flusk infra:reset
│   └── logs.command.ts      # flusk infra:logs
├── env/                     # NEW - Environment management
│   ├── setup.command.ts     # flusk env:setup
│   └── validate.command.ts  # flusk env:validate
└── validate/                # NEW - Project validation
    ├── schema.command.ts    # flusk validate:schema
    ├── structure.command.ts # flusk validate:structure
    └── config.command.ts    # flusk validate:config
```

**Responsibilities**:
- Parse command-line arguments (via commander.js)
- Validate user inputs
- Orchestrate generator calls
- Display styled output (via chalk + ora)
- Handle errors gracefully

**Pattern**: Each command is a commander.js Command instance with:
```typescript
export const commandName = new Command('name')
  .description('Description')
  .argument('[arg]', 'Argument description')
  .option('--flag', 'Flag description')
  .action(async (args, options) => {
    // Command logic
  });
```

---

### 2. Generators Layer

**Purpose**: Pure business logic, transforms inputs to outputs

```typescript
src/generators/
├── types.generator.ts           # EXISTING - TypeScript types
├── resources.generator.ts       # EXISTING - Repositories + migrations
├── business-logic.generator.ts  # EXISTING - Pure functions
├── execution.generator.ts       # EXISTING - Routes + plugins
├── project.generator.ts         # NEW - Project structure
├── infrastructure.generator.ts  # NEW - Docker configs
├── service.generator.ts         # NEW - Service layer
├── middleware.generator.ts      # NEW - Middleware
├── plugin.generator.ts          # NEW - Fastify plugins
├── test.generator.ts            # NEW - Test files
└── utils.ts                     # EXISTING - Naming utilities
```

**Responsibilities**:
- Transform TypeBox schemas to code
- Generate files from templates
- Apply naming conventions
- Return file paths + content (no I/O)

**Pattern**: Pure functions that return GeneratedFile[]
```typescript
interface GeneratedFile {
  path: string;      // Absolute path
  content: string;   // File content
  overwrite: boolean;// Whether to overwrite existing
}

export async function generateX(
  entityPath: string,
  entityName: string
): Promise<GeneratedFile[]> {
  // Pure transformation logic
  return [{ path, content, overwrite }];
}
```

---

### 3. Templates Layer

**Purpose**: Reusable code templates with variable interpolation

```typescript
src/templates/
├── repository.template.ts       # EXISTING
├── routes.template.ts           # EXISTING
├── migration.template.ts        # EXISTING
├── plugin.template.ts           # EXISTING
├── infrastructure/              # NEW
│   ├── docker-compose.template.ts
│   ├── gitignore.template.ts
│   ├── env.template.ts
│   └── watt.template.ts
├── service/                     # NEW
│   └── service.template.ts
├── middleware/                  # NEW
│   └── middleware.template.ts
└── test/                        # NEW
    ├── unit.template.ts
    └── integration.template.ts
```

**Responsibilities**:
- Provide code templates
- Accept variables for interpolation
- Return generated code string

**Pattern**: Functions that return template strings
```typescript
export function entityTemplate(vars: {
  entityName: string;
  pascalName: string;
  // ...
}): string {
  return `
// Generated code using ${vars.entityName}
export class ${vars.pascalName} {
  // ...
}
  `.trim();
}
```

---

### 4. Interactive Layer

**Purpose**: Interactive CLI prompts for user input

```typescript
src/interactive/                 # NEW
├── entity.prompts.ts           # Entity field prompts
├── project.prompts.ts          # Project setup prompts
└── component.prompts.ts        # Component creation prompts
```

**Responsibilities**:
- Collect user input interactively
- Validate input during collection
- Return structured data

**Pattern**: Functions that use inquirer.js
```typescript
export async function promptForEntity(): Promise<EntityDefinition> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'entityName',
      message: 'Entity name:',
      validate: (input) => input.length > 0
    },
    // More prompts...
  ]);
  return answers;
}
```

---

### 5. Validators Layer

**Purpose**: Validation logic for schemas, structure, config

```typescript
src/validators/                  # NEW
├── schema.validator.ts         # TypeBox schema validation
├── structure.validator.ts      # Project structure validation
└── config.validator.ts         # Configuration validation
```

**Responsibilities**:
- Validate entity schemas (TypeBox)
- Validate project structure (directories exist)
- Validate configurations (package.json, watt.json)
- Return validation results with errors

**Pattern**: Functions that return ValidationResult
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSchema(schemaPath: string): ValidationResult {
  // Validation logic
  return { valid, errors };
}
```

---

### 6. Utils Layer

**Purpose**: Shared utility functions

```typescript
src/utils/
├── file-system.ts              # ENHANCED - fs-extra wrapper
├── naming.ts                   # EXISTING - Case conversions
├── docker.ts                   # NEW - Docker wrapper
├── git.ts                      # NEW - Git operations
└── logger.ts                   # NEW - Styled console output
```

**Responsibilities**:
- File system operations (atomic writes)
- Naming convention conversions
- Docker CLI wrapper
- Git operations
- Styled logging

---

## Data Flow

### Project Initialization Flow

```
User runs: flusk init my-project
    ↓
1. Commands Layer (init.command.ts)
   ├─ Parse arguments: project-name
   ├─ Prompt for details (if missing)
   └─ Call project.generator
    ↓
2. Generators Layer (project.generator.ts)
   ├─ Generate directory structure
   ├─ Call infrastructure.generator for configs
   └─ Return GeneratedFile[]
    ↓
3. Templates Layer
   ├─ docker-compose.template.ts
   ├─ gitignore.template.ts
   ├─ env.template.ts
   └─ watt.template.ts
    ↓
4. Utils Layer (file-system.ts)
   ├─ Write all files to disk
   └─ Initialize git repo
    ↓
5. Display success message
   └─ Show next steps
```

### Code Generation Flow (Existing, Enhanced)

```
User runs: flusk g llm-call.entity.ts
    ↓
1. Commands Layer (generate.command.ts)
   ├─ Parse arguments: entity-file
   ├─ Validate file exists
   └─ Call generators in sequence
    ↓
2. Generators Layer
   ├─ types.generator.ts → TypeScript interfaces
   ├─ resources.generator.ts → Repository + migration
   ├─ business-logic.generator.ts → Validation functions
   └─ execution.generator.ts → Routes + plugins
    ↓
3. Templates Layer
   ├─ Load entity schema (TypeBox)
   ├─ Extract metadata (fields, types)
   └─ Apply templates
    ↓
4. Utils Layer (naming.ts)
   ├─ Convert names: kebab → PascalCase
   └─ Generate table name: entity → entities
    ↓
5. Utils Layer (file-system.ts)
   └─ Write all files to disk
    ↓
6. Display summary
   └─ List generated files
```

### Interactive Entity Creation Flow

```
User runs: flusk create:entity
    ↓
1. Commands Layer (create/entity.command.ts)
   └─ Call entity.prompts
    ↓
2. Interactive Layer (entity.prompts.ts)
   ├─ Prompt: Entity name?
   ├─ Loop: Add field?
   │   ├─ Field name
   │   ├─ Field type (select)
   │   ├─ Required? (yes/no)
   │   └─ Unique? (yes/no)
   └─ Return EntityDefinition
    ↓
3. Generators Layer
   └─ Build TypeBox schema from definition
    ↓
4. Utils Layer (file-system.ts)
   └─ Write entity file to packages/entities/src/
    ↓
5. Display success
   └─ Suggest: flusk g <entity-name>
```

### Infrastructure Management Flow

```
User runs: flusk infra:up
    ↓
1. Commands Layer (infra/up.command.ts)
   ├─ Check docker-compose.yml exists
   └─ Call docker.up()
    ↓
2. Utils Layer (docker.ts)
   ├─ Execute: docker compose up -d
   ├─ Wait for health checks
   │   ├─ PostgreSQL port 5432
   │   └─ Redis port 6379
   └─ Return service URLs
    ↓
3. Display success
   ├─ Show service URLs
   └─ Show next steps (migrations)
```

---

## Architecture Decisions

### ADR-001: Command Framework - Commander.js

**Status**: Accepted
**Date**: 2026-02-06

**Context**: Need structured CLI with subcommands, options, help text.

**Decision**: Continue using Commander.js (already integrated).

**Consequences**:
- ✅ No migration cost
- ✅ Team already familiar
- ✅ Sufficient features for requirements
- ❌ Fewer features than yargs (acceptable)

**Alternatives Considered**:
- Yargs (more features, larger bundle)
- oclif (overkill for our needs)

---

### ADR-002: Template Engine - TypeScript Template Literals

**Status**: Accepted
**Date**: 2026-02-06

**Context**: Need code generation with variable interpolation.

**Decision**: Continue using TypeScript template literals.

**Consequences**:
- ✅ No new dependency
- ✅ Type-safe templates
- ✅ Simple to maintain
- ❌ Complex logic must be in generator (acceptable)

**Alternatives Considered**:
- Handlebars (adds dependency, not type-safe)
- EJS (similar to Handlebars)

---

### ADR-003: Interactive Prompts - Inquirer.js

**Status**: Accepted
**Date**: 2026-02-06

**Context**: Need interactive prompts for entity creation, project setup.

**Decision**: Add Inquirer.js for interactive prompts.

**Consequences**:
- ✅ Industry standard
- ✅ Feature-rich
- ✅ TypeScript support
- ❌ Larger bundle (acceptable for CLI)

**Alternatives Considered**:
- Prompts (lightweight, fewer features)
- Enquirer (modern, less adoption)

---

### ADR-004: Docker Integration - Shell Command Wrapper

**Status**: Accepted
**Date**: 2026-02-06

**Context**: Need to manage Docker Compose lifecycle from Node.js.

**Decision**: Use execa to wrap `docker compose` CLI commands.

**Consequences**:
- ✅ Simple implementation
- ✅ Uses standard CLI (familiar)
- ✅ Easy to debug
- ❌ Requires docker CLI installed (already a requirement)

**Alternatives Considered**:
- dockerode (complex, no direct Compose support)
- docker-compose npm (deprecated)

---

### ADR-005: File System Operations - fs-extra

**Status**: Accepted
**Date**: 2026-02-06

**Context**: Need enhanced file operations (ensureDir, copy, atomic writes).

**Decision**: Add fs-extra for enhanced file system utilities.

**Consequences**:
- ✅ Built-in utilities save time
- ✅ Promise-based
- ✅ Well-maintained
- ❌ Adds dependency (small impact)

**Alternatives Considered**:
- node:fs/promises (native, but missing utilities)
- graceful-fs (just retry logic)

---

### ADR-006: CLI Output Styling - Chalk + Ora

**Status**: Accepted
**Date**: 2026-02-06

**Context**: Need styled output (colors, spinners) for better UX.

**Decision**: Continue Chalk (existing), add Ora for spinners.

**Consequences**:
- ✅ Professional UX
- ✅ Chalk already integrated
- ✅ Ora is small addition
- ❌ Adds Ora dependency (acceptable)

**Alternatives Considered**:
- Kleur (not integrated, fewer features)
- Listr (overkill for our needs)

---

### ADR-007: Schema Validation - TypeBox Compiler

**Status**: Accepted
**Date**: 2026-02-06

**Context**: Need to validate entity schemas are valid TypeBox.

**Decision**: Use TypeBox TypeCompiler (already a dependency).

**Consequences**:
- ✅ Native to TypeBox
- ✅ Type-safe validation
- ✅ No extra dependency
- ❌ None significant

**Alternatives Considered**:
- Ajv (requires JSON Schema conversion)
- Custom validation (incomplete, maintenance burden)

---

### ADR-008: Project Structure - Composable Monolith

**Status**: Accepted
**Date**: 2026-02-06

**Context**: CLI must generate projects following Flusk architecture.

**Decision**: Maintain composable monolith pattern (single deployment, plugin-based isolation).

**Consequences**:
- ✅ Consistent with existing architecture
- ✅ Developers familiar
- ✅ Proven pattern for this use case
- ❌ Can become complex (mitigated by plugin isolation)

**Alternatives Considered**:
- Microservices (deployment complexity, doesn't align)
- Modular monolith (different from existing)

---

## Dependencies

### Existing Dependencies
```json
{
  "@sinclair/typebox": "^0.34.48",
  "commander": "^12.1.0",
  "chalk": "^5.4.1",
  "pg": "^8.13.1"
}
```

### New Dependencies (To Add)
```json
{
  "inquirer": "^9.2.0",        // Interactive CLI prompts
  "ora": "^8.0.0",             // Loading spinners
  "boxen": "^7.1.0",           // Terminal boxes
  "execa": "^8.0.0",           // Execute shell commands
  "fs-extra": "^11.2.0",       // Enhanced file system
  "yaml": "^2.3.0",            // YAML parsing (for docker-compose)
  "validator": "^13.11.0"      // Input validation
}
```

**Note**: Handlebars removed from plan (using TypeScript template literals instead).

---

## Implementation Roadmap

### Phase 1: Infrastructure Foundation (P0 - Days 1-3)
**BLOCKS ALL OTHER WORK**

| Task | Component | Priority |
|------|-----------|----------|
| Add dependencies | package.json | P0 |
| Create infrastructure templates | src/templates/infrastructure/ | P0 |
| Implement `flusk init` | src/commands/init/ | P0 |
| Implement infra commands | src/commands/infra/ | P0 |
| Docker wrapper utility | src/utils/docker.ts | P0 |

**Success Criteria**:
- ✅ `flusk init` creates working project <2 minutes
- ✅ `flusk infra:up` starts services successfully
- ✅ Generated docker-compose.yml works on first try

---

### Phase 2: Enhanced Code Generation (P1 - Days 4-7)

| Task | Component | Priority |
|------|-----------|----------|
| Interactive entity creation | src/interactive/, src/commands/create/ | P1 |
| Component generators | src/generators/ (service, middleware, plugin) | P1 |
| Test generator | src/generators/test.generator.ts | P1 |
| Templates | src/templates/ (service, middleware, test) | P1 |

**Success Criteria**:
- ✅ `flusk create:entity` generates valid entity file
- ✅ Component generators follow project conventions
- ✅ Test generator creates runnable tests

---

### Phase 3: Quality & Documentation (P2 - Days 8-10)

| Task | Component | Priority |
|------|-----------|----------|
| Validation commands | src/validators/, src/commands/validate/ | P2 |
| CLI documentation | docs/CLI_USAGE.md | P2 |
| E2E test suite | tests/ | P2 |
| Code review & QA | All components | P2 |

**Success Criteria**:
- ✅ Validation catches common errors
- ✅ Documentation complete and accurate
- ✅ E2E tests pass 100%

---

## Non-Functional Requirements

### Performance
- Code generation: <5 seconds per entity
- Infrastructure startup: <30 seconds
- CLI startup time: <500ms

### Reliability
- Idempotent operations (same result on retry)
- Atomic file writes (no partial files)
- Graceful error handling (clear messages)

### Maintainability
- Pure generator functions (testable)
- Modular commands (single responsibility)
- Clear naming conventions (consistent)

### Developer Experience
- Beautiful terminal output (colors, spinners)
- Clear error messages (actionable)
- Helpful next steps (guide user)

---

## Testing Strategy

### Unit Tests
- Generator functions (pure, easy to test)
- Naming utilities (case conversions)
- Validators (schema, structure, config)

### Integration Tests
- Command execution (end-to-end flows)
- File system operations (write, read, copy)
- Docker wrapper (compose up, down, logs)

### E2E Tests
- Full project initialization flow
- Code generation from entity
- Infrastructure lifecycle

---

## Security Considerations

### File System
- Validate paths (prevent directory traversal)
- Confirm before overwriting files
- Atomic writes (no partial files)

### Docker
- Use official Docker images (PostgreSQL, Redis)
- Secure default credentials (generated, not hardcoded)
- Network isolation (Docker networks)

### Input Validation
- Sanitize entity names (prevent injection)
- Validate file paths (prevent traversal)
- Validate schema definitions (prevent malformed schemas)

---

## Future Enhancements (Phase 4+)

### AI-Powered Features
- `flusk ai:generate "Create user auth service"`
- `flusk ai:refactor <file>` (performance optimization)
- `flusk ai:optimize <file>` (suggestions)

### Pattern Detection
- `flusk analyze:patterns` (detect code patterns)
- `flusk analyze:dependencies` (dependency graph)
- `flusk analyze:security` (vulnerability scan)

### Advanced Generators
- `flusk g:crud <entity> --with-tests --with-docs`
- `flusk docs:api` (OpenAPI/Swagger generation)
- `flusk docs:architecture` (architecture diagrams)

---

## Appendix

### Naming Conventions

| Input | Output | Function |
|-------|--------|----------|
| llm-call | LLMCall | toPascalCase() |
| llm-call | llmCall | toCamelCase() |
| LLMCall | llm-call | toKebabCase() |
| LLMCall | llm_call | toSnakeCase() |
| llm-call | llm_calls | toTableName() |

### Directory Structure Reference

```
packages/cli/
├── bin/
│   └── flusk.ts                    # Executable entry point
├── src/
│   ├── commands/                   # Command layer
│   │   ├── init/
│   │   ├── generate/
│   │   ├── migrate/
│   │   ├── create/
│   │   ├── infra/
│   │   ├── env/
│   │   └── validate/
│   ├── generators/                 # Generator layer
│   ├── templates/                  # Template layer
│   ├── interactive/                # Interactive layer
│   ├── validators/                 # Validator layer
│   └── utils/                      # Utils layer
├── dist/                           # Compiled output
└── package.json
```

### TypeBox Schema Pattern

```typescript
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

export const EntitySchema = Type.Composite([
  BaseEntitySchema,  // id, createdAt, updatedAt
  Type.Object({
    field: Type.String({ description: 'Field description' }),
    // More fields...
  })
]);

export type Entity = Static<typeof EntitySchema>;
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-06
**Next Review**: After Phase 1 completion
**Approval**: Software Architect
