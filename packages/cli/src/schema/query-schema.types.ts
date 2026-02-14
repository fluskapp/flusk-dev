/**
 * Custom query schema types for entity YAML definitions.
 *
 * WHY: Named queries let users declare common access patterns
 * in YAML. The generator produces type-safe query functions
 * instead of forcing raw SQL or ad-hoc repo methods.
 */

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Aggregate function type */
export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';

/** A single order-by clause */
export interface OrderByClause {
  field: string;
  direction: SortDirection;
}

/** A custom named query definition */
export interface QuerySchema {
  /** Human-readable description of what this query does */
  description?: string;
  /** Parameter names and their types */
  params?: Record<string, string>;
  /** WHERE clause conditions (field: operator) */
  where?: Record<string, string>;
  /** ORDER BY clauses */
  orderBy?: OrderByClause[];
  /** GROUP BY field names */
  groupBy?: string[];
  /** Aggregate functions to apply */
  aggregate?: Record<string, AggregateFunction>;
}
