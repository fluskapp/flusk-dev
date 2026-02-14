/**
 * E2E integration test for the GENERATED BudgetAlert entity.
 *
 * WHY: Proves the full generator pipeline works — YAML → migration → repository
 * with proper type conversions (boolean, JSON, optional fields), time-range,
 * and aggregation queries.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from '../connection.js';
import { runMigrations } from '../migrations.js';
import * as BudgetAlertRepo from '../../repositories/budget-alert.repository.js';

describe('Generated BudgetAlert Repository (E2E)', () => {
  beforeEach(() => {
    const db = getDb(':memory:');
    runMigrations(db);
  });

  afterEach(() => {
    closeDb();
  });

  const sampleData: BudgetAlertRepo.CreateBudgetAlertInput = {
    alertType: 'daily',
    threshold: 100,
    actual: 150.5,
    acknowledged: false,
  };

  // --- CRUD ---

  it('should create a budget alert and return it with generated fields', () => {
    const db = getDb();
    const created = BudgetAlertRepo.createBudgetAlert(db, sampleData);
    expect(created.id).toBeDefined();
    expect(created.id.length).toBe(32);
    expect(created.alertType).toBe('daily');
    expect(created.threshold).toBe(100);
    expect(created.actual).toBe(150.5);
    expect(created.acknowledged).toBe(false);
    expect(created.model).toBeUndefined();
    expect(created.metadata).toBeUndefined();
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();
  });

  it('should create with optional fields (model, metadata)', () => {
    const db = getDb();
    const created = BudgetAlertRepo.createBudgetAlert(db, {
      ...sampleData,
      model: 'gpt-4',
      metadata: { window: '24h', labels: ['prod'] },
    });
    expect(created.model).toBe('gpt-4');
    expect(created.metadata).toEqual({ window: '24h', labels: ['prod'] });
  });

  it('should find by ID', () => {
    const db = getDb();
    const created = BudgetAlertRepo.createBudgetAlert(db, sampleData);
    const found = BudgetAlertRepo.findBudgetAlertById(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.alertType).toBe('daily');
    // Boolean conversion: SQLite stores 0/1, should come back as boolean
    expect(found!.acknowledged).toBe(false);
    expect(typeof found!.acknowledged).toBe('boolean');
  });

  it('should return null for non-existent ID', () => {
    const db = getDb();
    const found = BudgetAlertRepo.findBudgetAlertById(db, 'nonexistent');
    expect(found).toBeNull();
  });

  it('should list with pagination', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, sampleData);
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, alertType: 'monthly' });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, alertType: 'per-call' });

    const all = BudgetAlertRepo.listBudgetAlerts(db, 10, 0);
    expect(all.length).toBe(3);

    const page = BudgetAlertRepo.listBudgetAlerts(db, 2, 0);
    expect(page.length).toBe(2);

    const page2 = BudgetAlertRepo.listBudgetAlerts(db, 2, 2);
    expect(page2.length).toBe(1);
  });

  it('should update and return updated entity', () => {
    const db = getDb();
    const created = BudgetAlertRepo.createBudgetAlert(db, sampleData);
    const updated = BudgetAlertRepo.updateBudgetAlert(db, created.id, {
      acknowledged: true,
      actual: 200,
    });
    expect(updated).not.toBeNull();
    expect(updated!.acknowledged).toBe(true);
    expect(updated!.actual).toBe(200);
    // Unchanged fields preserved
    expect(updated!.alertType).toBe('daily');
    expect(updated!.threshold).toBe(100);
  });

  it('should update JSON metadata', () => {
    const db = getDb();
    const created = BudgetAlertRepo.createBudgetAlert(db, sampleData);
    const updated = BudgetAlertRepo.updateBudgetAlert(db, created.id, {
      metadata: { reason: 'spike', agents: [1, 2, 3] },
    });
    expect(updated!.metadata).toEqual({ reason: 'spike', agents: [1, 2, 3] });
  });

  it('should delete and confirm deletion', () => {
    const db = getDb();
    const created = BudgetAlertRepo.createBudgetAlert(db, sampleData);
    const deleted = BudgetAlertRepo.deleteBudgetAlert(db, created.id);
    expect(deleted).toBe(true);
    const found = BudgetAlertRepo.findBudgetAlertById(db, created.id);
    expect(found).toBeNull();
  });

  it('should return false when deleting non-existent', () => {
    const db = getDb();
    expect(BudgetAlertRepo.deleteBudgetAlert(db, 'nonexistent')).toBe(false);
  });

  // --- Time-Range ---

  it('should find by time range', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, sampleData);
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, alertType: 'monthly' });

    // SQLite datetime('now') returns 'YYYY-MM-DD HH:MM:SS' in UTC
    const from = '2000-01-01 00:00:00';
    const to = '2099-12-31 23:59:59';

    const results = BudgetAlertRepo.findBudgetAlertsByTimeRange(db, from, to);
    expect(results.length).toBe(2);
  });

  it('should return empty for out-of-range time query', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, sampleData);

    const results = BudgetAlertRepo.findBudgetAlertsByTimeRange(
      db, '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z',
    );
    expect(results.length).toBe(0);
  });

  // --- Aggregation ---

  it('should count by model (indexed field)', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, model: 'gpt-4' });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, model: 'gpt-4' });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, model: 'claude-3' });

    const counts = BudgetAlertRepo.countByModel(db);
    expect(counts.find((c) => c.model === 'gpt-4')?.count).toBe(2);
    expect(counts.find((c) => c.model === 'claude-3')?.count).toBe(1);
  });

  it('should sum threshold', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, threshold: 100 });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, threshold: 250 });

    const total = BudgetAlertRepo.sumThreshold(db);
    expect(total).toBeCloseTo(350);
  });

  it('should sum actual', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, actual: 10.5 });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, actual: 20.3 });

    const total = BudgetAlertRepo.sumActual(db);
    expect(total).toBeCloseTo(30.8);
  });

  it('should sum threshold since a given date', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, threshold: 100 });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, threshold: 200 });

    const since = '2000-01-01 00:00:00';
    const total = BudgetAlertRepo.sumThresholdSince(db, since);
    expect(total).toBeCloseTo(300);

    // Far future — should be 0
    const futureTotal = BudgetAlertRepo.sumThresholdSince(db, '2099-01-01T00:00:00Z');
    expect(futureTotal).toBe(0);
  });

  it('should run generic aggregate query', () => {
    const db = getDb();
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, actual: 10 });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, actual: 20 });
    BudgetAlertRepo.createBudgetAlert(db, { ...sampleData, actual: 30 });

    const result = BudgetAlertRepo.aggregateBudgetAlerts(db, {
      op: 'avg', field: 'actual',
    });
    expect(result.length).toBe(1);
    expect(result[0].value).toBeCloseTo(20);
  });

  // --- Type conversions ---

  it('should handle boolean type conversion correctly', () => {
    const db = getDb();
    const withTrue = BudgetAlertRepo.createBudgetAlert(db, {
      ...sampleData, acknowledged: true,
    });
    expect(withTrue.acknowledged).toBe(true);
    expect(typeof withTrue.acknowledged).toBe('boolean');

    const found = BudgetAlertRepo.findBudgetAlertById(db, withTrue.id);
    expect(found!.acknowledged).toBe(true);
    expect(typeof found!.acknowledged).toBe('boolean');
  });

  it('should handle JSON roundtrip correctly', () => {
    const db = getDb();
    const metadata = { nested: { deep: true }, arr: [1, 'two', null] };
    const created = BudgetAlertRepo.createBudgetAlert(db, {
      ...sampleData, metadata,
    });
    expect(created.metadata).toEqual(metadata);

    const found = BudgetAlertRepo.findBudgetAlertById(db, created.id);
    expect(found!.metadata).toEqual(metadata);
  });

  it('should handle null/undefined optional fields', () => {
    const db = getDb();
    const created = BudgetAlertRepo.createBudgetAlert(db, sampleData);
    expect(created.model).toBeUndefined();
    expect(created.metadata).toBeUndefined();
  });
});
