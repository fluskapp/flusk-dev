# Regeneration System

Safe incremental code regeneration that preserves your custom code.

## How It Works

Every generated file contains two types of regions:

### GENERATED Regions
Machine-owned code that gets replaced on regeneration:
```typescript
// --- BEGIN GENERATED (do not edit) [crud] ---
export function createUser(db, data) { ... }
// --- END GENERATED ---
```

### CUSTOM Regions
Developer-owned code that survives regeneration:
```typescript
// --- BEGIN CUSTOM [repository] ---
export function findActiveUsers(db) { ... }
// --- END CUSTOM ---
```

## File Headers

Every generated file includes a header with:
- `@generated from <yaml-path>` — source traceability
- `Hash: <sha256>` — staleness detection
- `Generated: <timestamp>` — last generation time

## Commands

### `flusk regenerate`
Scans generated files, detects stale ones (YAML changed), regenerates.
- `--all` — regenerate everything, not just stale files
- `--dry-run` — preview without writing

### `flusk status`
Shows generation health: total files, stale count, custom sections.

## Best Practices

1. **Never edit GENERATED regions** — your changes will be lost
2. **Put custom logic in CUSTOM regions** — they survive regeneration
3. **Run `flusk status`** before and after YAML changes
4. **Use labels** on custom sections for clarity: `[business-logic]`
5. **Commit before regenerating** — easy rollback if needed

## Architecture

```
YAML change detected
  → Parse new YAML
  → Generate new file content (with region markers)
  → Smart-merge with existing file
    → GENERATED sections: replaced
    → CUSTOM sections: preserved
    → Orphaned sections: warned
  → Write merged file
```
