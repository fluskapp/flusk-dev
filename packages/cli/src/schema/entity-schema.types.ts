/** @generated —
 * Top-level entity schema type for YAML definitions.
 *
 * WHY: This is the single source of truth for what an entity
 * YAML file looks like. Parser, validator, and generators
 * all reference this type to stay in sync.
 */

import type { FieldSchema } from './field-schema.types.js';
import type { RelationSchema } from './relation-schema.types.js';
import type { CapabilitySchema } from './capability-schema.types.js';
import type { QuerySchema } from './query-schema.types.js';

/** Supported storage backends */
export type StorageTarget = 'sqlite' | 'postgres';

/** Complete entity definition as parsed from YAML */
export interface EntitySchema {
  /** Entity name in PascalCase */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Storage backends to generate for */
  storage?: StorageTarget[];
  /** Field definitions (keyed by field name) */
  fields: Record<string, FieldSchema>;
  /** Relation definitions (keyed by relation name) */
  relations?: Record<string, RelationSchema>;
  /** Capabilities to enable */
  capabilities?: CapabilitySchema;
  /** Custom named queries */
  queries?: Record<string, QuerySchema>;
}
