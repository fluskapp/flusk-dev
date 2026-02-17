# Generator Quality Roadmap

## Why This Matters
Generators are the single source of truth. A bug in a generator multiplies
across every entity × every language. Testing and documentation are not
optional — they're critical infrastructure.

## Testing Strategy

### Tier 1 — Unit Tests (per generator)
Every generator and template gets its own test file:
- Input: mock YAML schema
- Output: verify generated string contains correct syntax
- Cover: all type mappings, edge cases, defaults, constraints

**Node generators**: `packages/forge/src/generators/*.test.ts`
**Python generators**: `packages/forge/src/generators/python/*.test.ts`

### Tier 2 — Snapshot Tests
Golden file tests that catch unintended changes:
- Generate output from a fixed YAML
- Compare against committed snapshot
- CI fails if output changes without updating snapshot
- One snapshot per generator × language combination

### Tier 3 — Generated Code Validation
Verify the generated code actually works:
- **TypeScript**: generated files compile (`tsc --noEmit`)
- **Python**: generated files pass syntax check (`python -m py_compile`)
- **Python**: generated files pass type check (`mypy --strict`)
- **Python**: generated tests actually run (`pytest flusk-py/`)

### Tier 4 — E2E Round-Trip
Full pipeline test:
1. Create a test YAML entity
2. Run generators for both languages
3. Compile/check both outputs
4. Run generated tests in both languages
5. Verify CRUD operations work against real SQLite

### Tier 5 — Cross-Language Parity
Ensure Node and Python outputs are equivalent:
- Same entity YAML → same SQLite schema
- Same repository methods (create, find, update, delete)
- Same SQL queries (parameterized)
- Data written by Node can be read by Python and vice versa

## Documentation

### For Users (docs/generators/)
- `yaml-guide.md` — Complete YAML schema reference (exists, needs update)
- `python-guide.md` — How to use flusk-py, install, configure
- `dual-language.md` — How the same YAML generates both languages
- `adding-entities.md` — Step-by-step: create YAML → generate → test

### For Contributors (docs/generators/)
- `architecture.md` — How forge works: schema → templates → output
- `adding-a-generator.md` — How to create a new generator
- `adding-a-language.md` — How to add a third language (e.g., Go, Rust)
- `template-conventions.md` — Template coding standards
- `testing-generators.md` — How to write and run generator tests

### For AI Agents (docs/generators/)
- `agent-instructions.md` — Updated with dual-language rules (exists)
- `yaml-only-mode.md` — AI agents edit YAML, never generated code

## Implementation Phases

### Phase A — Foundation (next sprint)
- [ ] Snapshot tests for all existing Node generators
- [ ] Snapshot tests for all Python generators
- [ ] `python -m py_compile` validation in CI
- [ ] Update `check-generated.ts` to also verify Python files

### Phase B — Deep Testing (sprint after)
- [ ] Tier 3: mypy check on generated Python
- [ ] Tier 4: E2E round-trip test (YAML → generate → compile → test)
- [ ] Tier 5: Cross-language SQLite parity test
- [ ] pytest in CI for flusk-py/

### Phase C — Documentation (parallel)
- [ ] Update yaml-guide.md with all field types and options
- [ ] Write python-guide.md
- [ ] Write dual-language.md
- [ ] Write adding-a-generator.md
- [ ] Auto-generate API reference from YAML schemas

### Phase D — CI Enforcement
- [ ] CI job: generate → compile → test for both languages
- [ ] CI job: snapshot comparison (fail on drift)
- [ ] CI job: cross-language parity check
- [ ] Pre-commit hook: `flusk validate-generated --all-languages`
