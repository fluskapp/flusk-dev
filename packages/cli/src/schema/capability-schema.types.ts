/** @generated —
 * Capability schema types for entity YAML definitions.
 *
 * WHY: Capabilities drive trait-based code generation.
 * Enabling `crud: true` generates a full CRUD repository;
 * `time-range: true` adds findByTimeRange, etc.
 */

/** Capabilities that can be enabled per entity */
export interface CapabilitySchema {
  /** Generate full CRUD operations */
  crud?: boolean;
  /** Generate time-range query methods */
  'time-range'?: boolean;
  /** Generate aggregation methods (sum, avg, group-by) */
  aggregation?: boolean;
  /** Generate CSV/JSON export routes */
  export?: boolean;
  /** Use soft-delete (deletedAt) instead of hard delete */
  'soft-delete'?: boolean;
  /** Track createdBy/updatedBy audit fields */
  audit?: boolean;
}
