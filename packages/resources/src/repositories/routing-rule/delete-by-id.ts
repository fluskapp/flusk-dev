import { getPool } from './pool.js';

export async function deleteById(id: string): Promise<boolean> {
  const db = getPool();
  const result = await db.query('DELETE FROM routing_rules WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
