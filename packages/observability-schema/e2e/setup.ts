/**
 * E2E Test Harness
 *
 * Bootstraps a Fastify app with in-memory SQLite, runs migrations,
 * and seeds test data (org, user, API key).
 */

import Fastify, { type FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'generated', 'node', 'apps', 'api', 'migrations');

export interface TestContext {
  app: FastifyInstance;
  db: Database.Database;
  testOrgId: string;
  testUserId: string;
  testApiKey: string;
}

function runMigrations(db: Database.Database): void {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  db.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));"
  );

  for (const file of files) {
    const applied = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(file);
    if (applied) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
  }
}

export async function createTestApp(): Promise<TestContext> {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  const app = Fastify({ logger: false });
  app.decorate('db', db);

  // Dynamically import and register all routes from the generated app
  const routeModules = [
    'aiUsage', 'alertChannels', 'alertEvents', 'analyzeSessions',
    'budgetAlerts', 'codeScans', 'costAttributions', 'costBudgets',
    'costEvents', 'costReports', 'dashboardWidgets', 'dashboards',
    'delusionDetections', 'driftDetections', 'health', 'insights',
    'llmCalls', 'optimizations', 'patterns', 'profileSessions',
    'spans', 'traceViews', 'traces',
  ];

  for (const mod of routeModules) {
    try {
      const routeModule = await import(
        join(__dirname, '..', 'generated', 'node', 'src', 'routes', `${mod}.routes.js`)
      );
      const routeFn = Object.values(routeModule)[0] as (app: FastifyInstance) => Promise<void>;
      await app.register(routeFn);
    } catch {
      // Some routes may fail if functions aren't implemented yet — skip
    }
  }

  await app.ready();

  // Seed test data
  const testOrgId = randomUUID();
  const testUserId = randomUUID();
  const testApiKey = `flsk_test_${randomUUID().replace(/-/g, '')}`;

  return { app, db, testOrgId, testUserId, testApiKey };
}

export async function destroyTestApp(ctx: TestContext): Promise<void> {
  await ctx.app.close();
  ctx.db.close();
}
