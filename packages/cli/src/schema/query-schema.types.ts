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

/** What a query returns */
export type QueryReturns = 'single' | 'list' | 'scalar' | 'raw';

/** A custom named query definition */
export interface QuerySchema {
  /** Query name (when using array format) */
  name?: string;
  /** Human-readable description of what this query does */
  description?: string;
  /** Query type: standard (default) or raw-sql */
  type?: 'standard' | 'raw-sql';
  /** Parameter names and their types (e.g. { hash: { type: 'string' } }) */
  params?: Record<string, string | { type: string }>;
  /** WHERE clause (SQL string with :param placeholders) */
  where?: string | Record<string, string>;
  /** ORDER BY clause (SQL string) */
  order?: string;
  /** ORDER BY clauses (structured) */
  orderBy?: OrderByClause[];
  /** GROUP BY field names */
  groupBy?: string[];
  /** LIMIT clause */
  limit?: number;
  /** Raw SQL (only when type is 'raw-sql') */
  sql?: string;
  /** What the query returns */
  returns?: QueryReturns;
  /** Aggregate functions to apply */
  aggregate?: Record<string, AggregateFunction>;
}
