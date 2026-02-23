/**
 * Time-range trait — SQL builder helpers for Postgres and SQLite.
 */

export function buildPgTimeRange(
  n: string,
  tableName: string,
): string {
  return `/** Find ${n} records within a time range */
export async function findByTimeRange(
  pool: Pool,
  from: string,
  to: string,
): Promise<${n}Entity[]> {
  const result = await pool.query(
    \`SELECT * FROM ${tableName} WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC\`,
    [from, to],
  );
  return result.rows.map(rowToEntity);
}`;
}

export function buildSqliteTimeRange(
  n: string,
  tableName: string,
  p1: string,
  p2: string,
  dbType: string,
): string {
  return `/** Find ${n} records within a time range */
export function find${n}sByTimeRange(
  db: ${dbType}, from: string, to: string,
): ${n}Entity[] {
  const stmt = db.prepare(
    \`SELECT * FROM ${tableName} WHERE created_at >= ${p1} AND created_at <= ${p2} ORDER BY created_at DESC\`,
  );
  const rows = stmt.all(from, to) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}`;
}
