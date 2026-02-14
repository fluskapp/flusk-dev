/**
 * Relation schema types for entity YAML definitions.
 *
 * WHY: Relations define how entities connect. They drive
 * foreign key generation, JOIN queries, and cascade rules.
 */

/** Supported relation cardinalities */
export type RelationType = 'belongs-to' | 'has-many' | 'has-one';

/** Cascade behavior on parent delete */
export type CascadeType = 'cascade' | 'set-null' | 'restrict';

/** Definition of a relation between entities */
export interface RelationSchema {
  /** Target entity name (PascalCase) */
  entity: string;
  /** Relation cardinality */
  type: RelationType;
  /** Foreign key column name (auto-derived if omitted) */
  foreignKey?: string;
  /** Cascade behavior on delete (default: restrict) */
  cascade?: CascadeType;
  /** Human-readable description */
  description?: string;
}
