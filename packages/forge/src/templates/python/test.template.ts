/**
 * Python test template — pytest tests for entity + repository.
 *
 * WHY: Generates basic validation and CRUD tests for each entity,
 * ensuring generated code works out of the box.
 */

import type { EntitySchema } from '../../schema/entity-schema.types.js';
import { toSnakeCase, toKebabCase, toTableName } from '../../generators/utils.js';

/** Generate pytest test file content */
export function renderTestTemplate(schema: EntitySchema): string {
  const kebab = toKebabCase(schema.name);
  const snake = toSnakeCase(kebab.replace(/-/g, '_'));
  const table = toTableName(kebab);

  const lines = [
    '# --- BEGIN GENERATED ---',
    `"""Tests for ${schema.name} entity and repository."""`,
    '',
    'import sqlite3',
    'import pytest',
    `from flusk.entities.${snake} import ${schema.name}`,
    `from flusk.storage.sqlite.repositories.${snake}_repo import ${schema.name}Repository`,
    '',
    '',
    '@pytest.fixture',
    'def db() -> sqlite3.Connection:',
    '    conn = sqlite3.connect(":memory:")',
    `    conn.execute("""CREATE TABLE IF NOT EXISTS ${table} (`,
    '        id TEXT PRIMARY KEY,',
    '        created_at TEXT NOT NULL,',
    '        updated_at TEXT NOT NULL',
    '    )""")',
    '    return conn',
    '',
    '',
    '@pytest.fixture',
    `def repo(db: sqlite3.Connection) -> ${schema.name}Repository:`,
    `    return ${schema.name}Repository(db)`,
    '',
    '',
    `class Test${schema.name}Entity:`,
    `    """${schema.name} Pydantic model tests."""`,
    '',
    '    def test_create_minimal(self) -> None:',
    `        """Can create with required fields."""`,
    `        # TODO: fill required fields`,
    `        assert ${schema.name} is not None`,
    '',
    '',
    `class Test${schema.name}Repository:`,
    `    """${schema.name} repository CRUD tests."""`,
    '',
    `    def test_insert_and_find(self, repo: ${schema.name}Repository) -> None:`,
    '        data = {"id": "test-1", "created_at": "2026-01-01", "updated_at": "2026-01-01"}',
    '        repo.insert(data)',
    '        result = repo.find_by_id("test-1")',
    '        assert result is not None',
    '        assert result["id"] == "test-1"',
    '',
    `    def test_delete(self, repo: ${schema.name}Repository) -> None:`,
    '        data = {"id": "test-2", "created_at": "2026-01-01", "updated_at": "2026-01-01"}',
    '        repo.insert(data)',
    '        assert repo.delete("test-2") is True',
    '        assert repo.find_by_id("test-2") is None',
    '# --- END GENERATED ---',
    '',
  ];

  return lines.join('\n');
}
