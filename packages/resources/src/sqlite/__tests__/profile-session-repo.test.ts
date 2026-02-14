import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from '../connection.js';
import { runMigrations } from '../migrations.js';
import * as ProfileSessionRepo from '../repositories/profile-session/index.js';

describe('SQLite Profile Session Repository', () => {
  beforeEach(() => {
    const db = getDb(':memory:');
    runMigrations(db);
  });

  afterEach(() => {
    closeDb();
  });

  const sampleData = {
    name: 'test-session',
    profileType: 'cpu' as const,
    durationMs: 5000,
    totalSamples: 100,
    hotspots: [{ functionName: 'main', filePath: 'app.js', cpuPercent: 50, samples: 50 }],
    markdownRaw: '# Profile',
    pprofPath: '/tmp/test.pb',
    flamegraphPath: '/tmp/test.html',
    traceIds: ['trace-1'],
    startedAt: '2026-01-01T00:00:00',
  };

  it('should create and find by id', () => {
    const db = getDb();
    const created = ProfileSessionRepo.create(db, sampleData);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('test-session');

    const found = ProfileSessionRepo.findById(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.hotspots.length).toBe(1);
  });

  it('should list sessions', () => {
    const db = getDb();
    ProfileSessionRepo.create(db, sampleData);
    const all = ProfileSessionRepo.list(db);
    expect(all.length).toBe(1);
  });
});
