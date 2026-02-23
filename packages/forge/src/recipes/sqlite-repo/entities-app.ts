/**
 * Entity definitions for app-level entities (analyze-session, budget-alert,
 * conversion, llm-call).
 */

import type { EntityDef } from './types.js';

export const APP_ENTITIES: EntityDef[] = [
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
];
