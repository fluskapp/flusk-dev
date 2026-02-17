/**
 * Python repository template — sqlite3 CRUD repository.
 *
 * WHY: Generates a Python sqlite3 repository with parameterized
 * queries, matching the Node.js repository pattern.
 */

import type { EntitySchema } from '../../schema/entity-schema.types.js';
import { toSnakeCase, toKebabCase, toTableName } from '../../generators/utils.js';

/** Generate repository file content */
export function renderRepositoryTemplate(schema: EntitySchema): string {
  const kebab = toKebabCase(schema.name);
  const table = toTableName(kebab);
  const snakeFields = Object.keys(schema.fields).map(toSnakeCase);
  const _columns = ['id', ...snakeFields, 'created_at', 'updated_at'];
  const _placeholders = snakeFields.map((c) => `:${c}`);
  const hasSoftDelete = schema.capabilities?.['soft-delete'];
  const deleteClause = hasSoftDelete
    ? `"UPDATE ${table} SET deleted_at = :now WHERE id = :id"`
    : `"DELETE FROM ${table} WHERE id = :id"`;

  const lines = [
    '# --- BEGIN GENERATED ---',
    `"""${schema.name} SQLite repository."""`,
    '',
    'import sqlite3',
    'from datetime import datetime, timezone',
    'from typing import Any',
    '',
    '',
    `class ${schema.name}Repository:`,
    `    """CRUD repository for ${table}."""`,
    '',
    '    def __init__(self, db: sqlite3.Connection) -> None:',
    '        self._db = db',
    '        self._db.row_factory = sqlite3.Row',
    '',
    '    def find_by_id(self, id: str) -> dict[str, Any] | None:',
    `        row = self._db.execute("SELECT * FROM ${table} WHERE id = ?", (id,)).fetchone()`,
    '        return dict(row) if row else None',
    '',
    '    def find_all(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:',
    `        rows = self._db.execute("SELECT * FROM ${table} LIMIT ? OFFSET ?", (limit, offset)).fetchall()`,
    '        return [dict(r) for r in rows]',
    '',
    `    def insert(self, data: dict[str, Any]) -> dict[str, Any]:`,
    '        now = datetime.now(timezone.utc).isoformat()',
    '        data.setdefault("created_at", now)',
    '        data.setdefault("updated_at", now)',
    `        cols = ", ".join(data.keys())`,
    `        vals = ", ".join(f":{k}" for k in data.keys())`,
    `        self._db.execute(f"INSERT INTO ${table} ({'{'}cols{'}'}) VALUES ({'{'}vals{'}'})", data)`,
    '        self._db.commit()',
    '        return self.find_by_id(data["id"]) or data',
    '',
    `    def update(self, id: str, data: dict[str, Any]) -> dict[str, Any] | None:`,
    '        data["updated_at"] = datetime.now(timezone.utc).isoformat()',
    `        sets = ", ".join(f"{k} = :{k}" for k in data.keys())`,
    `        self._db.execute(f"UPDATE ${table} SET {'{'}sets{'}'} WHERE id = :id", {**data, "id": id})`,
    '        self._db.commit()',
    '        return self.find_by_id(id)',
    '',
    `    def delete(self, id: str) -> bool:`,
    hasSoftDelete
      ? '        now = datetime.now(timezone.utc).isoformat()\n'
        + `        cur = self._db.execute(${deleteClause}, {"now": now, "id": id})`
      : `        cur = self._db.execute(${deleteClause}, {"id": id})`,
    '        self._db.commit()',
    '        return (cur.rowcount or 0) > 0',
    '# --- END GENERATED ---',
    '',
  ];

  return lines.join('\n');
}
