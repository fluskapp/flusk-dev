/**
 * Database migration runner
 * Runs all SQL migrations in order against PostgreSQL
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://flusk:dev_password_change_me@localhost:5432/flusk';

async function migrate() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Create migrations tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Get already applied migrations
  const { rows } = await client.query('SELECT name FROM _migrations ORDER BY name');
  const applied = new Set(rows.map((r: { name: string }) => r.name));

  // Read migration files
  const dir = join(import.meta.dirname, '..', 'packages/resources/src/migrations');
  const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭  ${file} (already applied)`);
      continue;
    }
    const sql = await readFile(join(dir, file), 'utf-8');
    console.log(`▶  ${file}...`);
    try {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`✅ ${file}`);
    } catch (err: any) {
      console.error(`❌ ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  await client.end();
  console.log('\n✅ All migrations applied');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
