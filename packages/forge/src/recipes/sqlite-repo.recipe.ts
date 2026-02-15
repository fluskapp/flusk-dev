/**
 * SQLite repository recipe — generates CRUD files for an entity.
 *
 * WHY: Every entity needs the same 6 files (create, find-by-id, list,
 * update, row-to-entity, index). This recipe generates them from entity
 * metadata, keeping custom code sections untouched.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep, RecipeContext } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';

/* ------------------------------------------------------------------ */
/*  Field metadata types                                               */
/* ------------------------------------------------------------------ */

interface FieldDef {
  /** camelCase name as used in entity TS type */
  camel: string;
  /** snake_case column name in SQLite */
  snake: string;
  /** How to handle this field in generated code */
  kind: 'string' | 'number' | 'integer' | 'boolean' | 'json' | 'datetime';
  /** Whether the field is optional (Type.Optional) */
  optional?: boolean;
  /**
   * Extra type cast expression for rowToEntity, e.g. `'cpu' | 'heap'`
   * When set, `as <castAs>` is used instead of the default.
   */
  castAs?: string;
  /**
   * Import type for JSON.parse cast in rowToEntity,
   * e.g. 'TokenUsage' or 'HotspotEntry[]'
   */
  jsonType?: string;
  /**
   * Use entity-level union cast: e.g. `BudgetAlertEntity['alertType']`
   */
  entityFieldCast?: boolean;
}

interface EntityDef {
  /** kebab-case name, e.g. 'budget-alert' */
  name: string;
  /** SQLite table name, e.g. 'budget_alerts' */
  table: string;
  /** PascalCase entity type, e.g. 'BudgetAlertEntity' */
  entityType: string;
  /** Human-readable label for docs */
  label: string;
  /** Non-base fields (id, createdAt, updatedAt handled automatically) */
  fields: FieldDef[];
  /** Extra type imports from @flusk/entities (beyond the entity type) */
  extraImports?: string[];
  /** Extra custom exports for the barrel (beyond the 4 CRUD ops) */
  extraBarrelExports?: string[];
}

/* ------------------------------------------------------------------ */
/*  Entity definitions                                                 */
/* ------------------------------------------------------------------ */

const ENTITIES: EntityDef[] = [
  {
    name: 'analyze-session',
    table: 'analyze_sessions',
    entityType: 'AnalyzeSessionEntity',
    label: 'Analyze session',
    extraImports: ['ModelsUsed'],
    fields: [
      { camel: 'script', snake: 'script', kind: 'string' },
      { camel: 'durationMs', snake: 'duration_ms', kind: 'integer' },
      { camel: 'totalCalls', snake: 'total_calls', kind: 'integer' },
      { camel: 'totalCost', snake: 'total_cost', kind: 'number' },
      { camel: 'modelsUsed', snake: 'models_used', kind: 'json', jsonType: 'ModelsUsed' },
      { camel: 'startedAt', snake: 'started_at', kind: 'datetime' },
      { camel: 'completedAt', snake: 'completed_at', kind: 'datetime', optional: true },
    ],
  },
  {
    name: 'budget-alert',
    table: 'budget_alerts',
    entityType: 'BudgetAlertEntity',
    label: 'Budget alert',
    fields: [
      { camel: 'alertType', snake: 'alert_type', kind: 'string', entityFieldCast: true },
      { camel: 'threshold', snake: 'threshold', kind: 'number' },
      { camel: 'actual', snake: 'actual', kind: 'number' },
      { camel: 'model', snake: 'model', kind: 'string', optional: true },
      { camel: 'acknowledged', snake: 'acknowledged', kind: 'boolean' },
      { camel: 'metadata', snake: 'metadata', kind: 'json', optional: true },
    ],
  },
  {
    name: 'conversion',
    table: 'conversions',
    entityType: 'ConversionEntity',
    label: 'Conversion',
    extraBarrelExports: [
      "export { findByPattern } from './find-by-pattern.js';",
      "export { findSuggested } from './find-suggested.js';",
      "export { findAccepted } from './find-accepted.js';",
    ],
    fields: [
      { camel: 'patternId', snake: 'pattern_id', kind: 'string' },
      { camel: 'organizationId', snake: 'organization_id', kind: 'string' },
      { camel: 'conversionType', snake: 'conversion_type', kind: 'string', entityFieldCast: true },
      { camel: 'status', snake: 'status', kind: 'string', entityFieldCast: true },
      { camel: 'estimatedSavings', snake: 'estimated_savings', kind: 'number' },
      { camel: 'config', snake: 'config', kind: 'json' },
    ],
  },
  {
    name: 'llm-call',
    table: 'llm_calls',
    entityType: 'LLMCallEntity',
    label: 'LLM call',
    extraImports: ['TokenUsage'],
    extraBarrelExports: [
      "export { findByPromptHash } from './find-by-prompt-hash.js';",
      "export { sumCost } from './sum-cost.js';",
      "export { sumCostSince } from './sum-cost-since.js';",
      "export { countByModel } from './count-by-model.js';",
      "export { countDuplicates } from './count-duplicates.js';",
    ],
    fields: [
      { camel: 'provider', snake: 'provider', kind: 'string' },
      { camel: 'model', snake: 'model', kind: 'string' },
      { camel: 'prompt', snake: 'prompt', kind: 'string' },
      { camel: 'promptHash', snake: 'prompt_hash', kind: 'string' },
      { camel: 'tokens', snake: 'tokens', kind: 'json', jsonType: 'TokenUsage' },
      { camel: 'cost', snake: 'cost', kind: 'number' },
      { camel: 'response', snake: 'response', kind: 'string' },
      { camel: 'cached', snake: 'cached', kind: 'boolean' },
      { camel: 'agentLabel', snake: 'agent_label', kind: 'string', optional: true },
      { camel: 'organizationId', snake: 'organization_id', kind: 'string', optional: true },
      { camel: 'consentGiven', snake: 'consent_given', kind: 'boolean' },
      { camel: 'consentPurpose', snake: 'consent_purpose', kind: 'string' },
    ],
  },
  {
    name: 'pattern',
    table: 'patterns',
    entityType: 'PatternEntity',
    label: 'Pattern',
    extraBarrelExports: [
      "export { findByPromptHash } from './find-by-prompt-hash.js';",
      "export { findByOrganization } from './find-by-organization.js';",
      "export { updateOccurrence } from './update-occurrence.js';",
    ],
    fields: [
      { camel: 'organizationId', snake: 'organization_id', kind: 'string' },
      { camel: 'promptHash', snake: 'prompt_hash', kind: 'string' },
      { camel: 'occurrenceCount', snake: 'occurrence_count', kind: 'integer' },
      { camel: 'firstSeenAt', snake: 'first_seen_at', kind: 'datetime' },
      { camel: 'lastSeenAt', snake: 'last_seen_at', kind: 'datetime' },
      { camel: 'samplePrompts', snake: 'sample_prompts', kind: 'json' },
      { camel: 'avgCost', snake: 'avg_cost', kind: 'number' },
      { camel: 'totalCost', snake: 'total_cost', kind: 'number' },
      { camel: 'suggestedConversion', snake: 'suggested_conversion', kind: 'string', optional: true },
    ],
  },
  {
    name: 'performance-pattern',
    table: 'performance_patterns',
    entityType: 'PerformancePatternEntity',
    label: 'Performance pattern',
    extraBarrelExports: [
      "export { findByProfileId } from './find-by-profile-id.js';",
    ],
    fields: [
      { camel: 'profileSessionId', snake: 'profile_session_id', kind: 'string' },
      { camel: 'pattern', snake: 'pattern', kind: 'string' },
      { camel: 'severity', snake: 'severity', kind: 'string', entityFieldCast: true },
      { camel: 'description', snake: 'description', kind: 'string' },
      { camel: 'suggestion', snake: 'suggestion', kind: 'string' },
      { camel: 'metadata', snake: 'metadata', kind: 'json' },
      { camel: 'organizationId', snake: 'organization_id', kind: 'string', optional: true },
    ],
  },
  {
    name: 'profile-session',
    table: 'profile_sessions',
    entityType: 'ProfileSessionEntity',
    label: 'Profile session',
    extraImports: ['HotspotEntry'],
    fields: [
      { camel: 'name', snake: 'name', kind: 'string' },
      { camel: 'profileType', snake: 'profile_type', kind: 'string', castAs: "'cpu' | 'heap'" },
      { camel: 'durationMs', snake: 'duration_ms', kind: 'integer' },
      { camel: 'totalSamples', snake: 'total_samples', kind: 'integer' },
      { camel: 'hotspots', snake: 'hotspots', kind: 'json', jsonType: 'HotspotEntry[]' },
      { camel: 'markdownRaw', snake: 'markdown_raw', kind: 'string' },
      { camel: 'pprofPath', snake: 'pprof_path', kind: 'string' },
      { camel: 'flamegraphPath', snake: 'flamegraph_path', kind: 'string' },
      { camel: 'traceIds', snake: 'trace_ids', kind: 'json', jsonType: 'string[]' },
      { camel: 'organizationId', snake: 'organization_id', kind: 'string', optional: true },
      { camel: 'startedAt', snake: 'started_at', kind: 'datetime' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Template helpers                                                   */
/* ------------------------------------------------------------------ */

const HEADER = (_entity: EntityDef) => `/**
 * @generated by @flusk/cli — sqlite-repo recipe
 * DO NOT EDIT between GENERATED markers
 */`;

function genCreate(entity: EntityDef): string {
  const { entityType, table, label, fields } = entity;
  const columns = fields.map((f) => f.snake);
  const placeholders = fields.map(() => '?').join(', ');

  // Build value expressions for stmt.get(...)
  const valueExprs = fields.map((f) => {
    if (f.kind === 'json') {
      if (f.optional) {
        return `    data.${f.camel} != null ? JSON.stringify(data.${f.camel}) : null,`;
      }
      return `    JSON.stringify(data.${f.camel}),`;
    }
    if (f.kind === 'boolean') {
      return `    data.${f.camel} ? 1 : 0,`;
    }
    if (f.optional) {
      return `    data.${f.camel} ?? null,`;
    }
    return `    data.${f.camel},`;
  });

  // Format columns for INSERT — wrap at ~60 chars per line
  const colLines: string[] = [];
  let currentLine = '      ';
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const sep = i < columns.length - 1 ? ', ' : '';
    if (currentLine.length + col.length + sep.length > 70 && currentLine.trim().length > 0) {
      colLines.push(currentLine.trimEnd().replace(/,$/, ','));
      currentLine = '      ' + col + sep;
    } else {
      currentLine += col + sep;
    }
  }
  if (currentLine.trim()) colLines.push(currentLine);

  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new ${label} record into SQLite
 */
export function create(
  db: DatabaseSync,
  data: Omit<${entityType}, 'id' | 'createdAt' | 'updatedAt'>,
): ${entityType} {
  const stmt = db.prepare(\`
    INSERT INTO ${table} (
${colLines.join('\n')}
    ) VALUES (${placeholders})
    RETURNING *
  \`);

  const row = stmt.get(
${valueExprs.join('\n')}
  ) as Record<string, unknown>;

  return rowToEntity(row);
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}

function genFindById(entity: EntityDef): string {
  const { entityType, table } = entity;
  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find ${entity.label} by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): ${entityType} | null {
  const stmt = db.prepare('SELECT * FROM ${table} WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}

function genList(entity: EntityDef): string {
  const { entityType, table } = entity;
  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List ${entity.label}s with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): ${entityType}[] {
  const stmt = db.prepare(
    'SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}

function genUpdate(entity: EntityDef): string {
  const { entityType, table } = entity;
  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Update a ${entity.label}
 */
export function update(
  db: DatabaseSync,
  id: string,
  data: Partial<Omit<${entityType}, 'id' | 'createdAt' | 'updatedAt'>>,
): ${entityType} | null {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const snake = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      sets.push(\`\${snake} = ?\`);
      values.push(JSON.stringify(value) as string);
    } else {
      sets.push(\`\${snake} = ?\`);
      values.push(value as string | number | null);
    }
  }
  if (sets.length === 0) return null;
  values.push(id);
  const stmt = db.prepare(
    \`UPDATE ${table} SET \${sets.join(', ')} WHERE id = ? RETURNING *\`,
  );
  const row = stmt.get(...values) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}

function genRowToEntity(entity: EntityDef): string {
  const { entityType, fields, extraImports } = entity;

  // Build import line
  const importTypes = [entityType, ...(extraImports ?? [])].join(', ');

  // Build field mappings
  const mappings = fields.map((f) => {
    if (f.kind === 'json') {
      if (f.optional) {
        if (f.jsonType) {
          return `    ${f.camel}: row.${f.snake} != null ? JSON.parse(row.${f.snake} as string) as ${f.jsonType} : undefined,`;
        }
        return `    ${f.camel}: row.${f.snake} != null ? JSON.parse(row.${f.snake} as string) : undefined,`;
      }
      if (f.jsonType) {
        return `    ${f.camel}: JSON.parse(row.${f.snake} as string) as ${f.jsonType},`;
      }
      return `    ${f.camel}: JSON.parse(row.${f.snake} as string),`;
    }
    if (f.kind === 'boolean') {
      return `    ${f.camel}: Boolean(row.${f.snake}),`;
    }
    if (f.kind === 'datetime') {
      if (f.optional) {
        return `    ${f.camel}: row.${f.snake} != null ? toISOString(row.${f.snake}) : undefined,`;
      }
      return `    ${f.camel}: toISOString(row.${f.snake}),`;
    }
    if (f.optional) {
      return `    ${f.camel}: (row.${f.snake} as string) ?? undefined,`;
    }
    if (f.entityFieldCast) {
      return `    ${f.camel}: row.${f.snake} as ${entityType}['${f.camel}'],`;
    }
    if (f.castAs) {
      return `    ${f.camel}: row.${f.snake} as ${f.castAs},`;
    }
    if (f.kind === 'number' || f.kind === 'integer') {
      return `    ${f.camel}: row.${f.snake} as number,`;
    }
    return `    ${f.camel}: row.${f.snake} as string,`;
  });

  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { ${importTypes} } from '@flusk/entities';
import { toISOString } from '../../../shared/map-row.js';

/** Convert SQLite row to ${entityType} */
export function rowToEntity(row: Record<string, unknown>): ${entityType} {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
${mappings.join('\n')}
  };
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}

function genIndex(entity: EntityDef): string {
  const extras = entity.extraBarrelExports ?? [];
  const extraLines = extras.length > 0 ? '\n' + extras.join('\n') : '';

  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
/**
 * SQLite ${entity.label} Repository barrel
 */

export { create } from './create.js';
export { findById } from './find-by-id.js';
export { list } from './list.js';
export { update } from './update.js';
// --- END GENERATED ---

// --- BEGIN CUSTOM ---${extraLines}
// --- END CUSTOM ---
`;
}

/* ------------------------------------------------------------------ */
/*  Recipe steps                                                       */
/* ------------------------------------------------------------------ */

function makeEntitySteps(entity: EntityDef): RecipeStep[] {
  const dir = (ctx: RecipeContext) =>
    resolve(ctx.projectRoot, 'packages/resources/src/sqlite/repositories', entity.name);

  return [
    {
      name: `${entity.name}/create`,
      description: `Generate create.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'create.ts', genCreate(entity))] };
      },
    },
    {
      name: `${entity.name}/find-by-id`,
      description: `Generate find-by-id.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'find-by-id.ts', genFindById(entity))] };
      },
    },
    {
      name: `${entity.name}/list`,
      description: `Generate list.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'list.ts', genList(entity))] };
      },
    },
    {
      name: `${entity.name}/update`,
      description: `Generate update.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'update.ts', genUpdate(entity))] };
      },
    },
    {
      name: `${entity.name}/row-to-entity`,
      description: `Generate row-to-entity.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'row-to-entity.ts', genRowToEntity(entity))] };
      },
    },
    {
      name: `${entity.name}/index`,
      description: `Generate index.ts for ${entity.name}`,
      async run(ctx) {
        return { files: [writeRecipeFile(ctx, dir(ctx), 'index.ts', genIndex(entity))] };
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Exported recipe                                                    */
/* ------------------------------------------------------------------ */

export const sqliteRepoRecipe: Recipe = {
  name: 'sqlite-repo',
  description: 'Generate SQLite CRUD repository files for all entities',
  steps: ENTITIES.flatMap(makeEntitySteps),
};

/** Exported for direct use in scripts */
export { ENTITIES as SQLITE_REPO_ENTITIES };
