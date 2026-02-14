/** @generated —
 * Migration runner plugin — applies SQL migrations from @flusk/resources on startup.
 * Tracks applied migrations in _flusk_migrations table.
 */
import fp from 'fastify-plugin';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const plugin = fp(async (app) => {
  const migrationsDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../resources/src/migrations'
  );

  await app.pg.query(`
    CREATE TABLE IF NOT EXISTS _flusk_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const applied = await app.pg.query('SELECT name FROM _flusk_migrations');
  const appliedSet = new Set(applied.rows.map((r: { name: string }) => r.name));

  const files = (await readdir(migrationsDir))
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), 'utf-8');
    await app.pg.query(sql);
    await app.pg.query(
      'INSERT INTO _flusk_migrations (name) VALUES ($1)',
      [file]
    );
    app.log.info(`Migration applied: ${file}`);
  }
}, { name: 'flusk-migrate', dependencies: ['flusk-postgres'] });
