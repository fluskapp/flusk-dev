/**
 * @generated from ../../../../var/folders/0y/2gxg7svd4dz8rwk3wz7x7x7m0000gn/T/flusk-gen-test-FWhAyG/test-widget.entity.yaml
 * Hash: b382af73589cfbf6135353c0b83a21ae986885a1456f4eebaa74a9af92324302
 * Generated: 2026-02-14T19:31:59.095Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

CREATE TABLE IF NOT EXISTS test_widgets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  label TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_test_widgets_created_at ON test_widgets(created_at);