/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import chalk from 'chalk';

export const migrateCommand = new Command('migrate')
  .description('Run database migrations')
  .action(async () => {
    const migrationsDir = resolve(process.cwd(), 'packages/resources/src/migrations');

    if (!existsSync(migrationsDir)) {
      console.error(chalk.red('Error: migrations directory not found'));
      process.exit(1);
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error(chalk.red('Error: DATABASE_URL environment variable is required'));
      process.exit(1);
    }

    const pool = new Pool({ connectionString });

    try {
      console.log(chalk.blue('\n🗄️  Running migrations...\n'));

      // Get all migration files sorted by name
      const migrationFiles = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const filePath = resolve(migrationsDir, file);
        const sql = await readFile(filePath, 'utf-8');

        console.log(chalk.cyan(`  📄 Running: ${file}`));

        await pool.query(sql);

        console.log(chalk.green(`  ✅ ${file} completed`));
      }

      console.log(chalk.green('\n✨ All migrations completed successfully!\n'));
    } catch (error) {
      console.error(chalk.red('Migration failed:'), error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  });
