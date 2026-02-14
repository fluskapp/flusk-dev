import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from '../connection.js';
import { runMigrations } from '../migrations.js';
import * as ProfileSessionRepo from '../repositories/profile-session/index.js';
import * as PatternRepo from '../repositories/performance-pattern/index.js';

describe('SQLite Performance Pattern Repository', () => {
  let profileId: string;

  beforeEach(() => {
    const db = getDb(':memory:');
    runMigrations(db);
    const session = ProfileSessionRepo.create(db, {
      name: 'test', profileType: 'cpu', durationMs: 1000, totalSamples: 10,
      hotspots: [], markdownRaw: '', pprofPath: '', flamegraphPath: '',
      traceIds: [], startedAt: '2026-01-01T00:00:00',
    });
    profileId = session.id;
  });

  afterEach(() => {
    closeDb();
  });

  it('should create and find by profile id', () => {
    const db = getDb();
    PatternRepo.create(db, {
      profileSessionId: profileId,
      pattern: 'duplicate-prompt',
      severity: 'high',
      description: 'Found duplicate prompts',
      suggestion: 'Use caching',
      metadata: { count: 5 },
    });

    const patterns = PatternRepo.findByProfileId(db, profileId);
    expect(patterns.length).toBe(1);
    expect(patterns[0].pattern).toBe('duplicate-prompt');
  });

  it('should list patterns', () => {
    const db = getDb();
    PatternRepo.create(db, {
      profileSessionId: profileId,
      pattern: 'test', severity: 'low',
      description: 'd', suggestion: 's', metadata: {},
    });
    const all = PatternRepo.list(db);
    expect(all.length).toBe(1);
  });
});
