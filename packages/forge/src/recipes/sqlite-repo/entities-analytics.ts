/**
 * Entity definitions for analytics entities (pattern, performance-pattern,
 * profile-session).
 */

import type { EntityDef } from './types.js';

export const ANALYTICS_ENTITIES: EntityDef[] = [
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
