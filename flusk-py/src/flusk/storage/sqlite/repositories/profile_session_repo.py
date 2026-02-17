# --- BEGIN GENERATED ---
"""ProfileSession SQLite repository."""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_MIGRATION = "profile-session.sql"


class ProfileSessionRepository:
    """CRUD repository for profile_sessions."""

    def __init__(self, db: sqlite3.Connection) -> None:
        self._db = db
        self._db.row_factory = sqlite3.Row

    @staticmethod
    def _get_migration_path() -> Path:
        return Path(__file__).parent.parent / "migrations" / _MIGRATION

    def ensure_tables(self) -> None:
        """Read and execute the SQL migration file."""
        sql = self._get_migration_path().read_text(encoding="utf-8")
        self._db.executescript(sql)

    def find_by_id(self, id: str) -> dict[str, Any] | None:
        row = self._db.execute("SELECT * FROM profile_sessions WHERE id = ?", (id,)).fetchone()
        return dict(row) if row else None

    def find_all(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        rows = self._db.execute("SELECT * FROM profile_sessions LIMIT ? OFFSET ?", (limit, offset)).fetchall()
        return [dict(r) for r in rows]

    def insert(self, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        cols = ", ".join(data.keys())
        vals = ", ".join(f":{k}" for k in data.keys())
        self._db.execute(f"INSERT INTO profile_sessions ({cols}) VALUES ({vals})", data)
        self._db.commit()
        return self.find_by_id(data["id"]) or data

    def update(self, id: str, data: dict[str, Any]) -> dict[str, Any] | None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        sets = ", ".join(f"{k} = :{k}" for k in data.keys())
        self._db.execute(f"UPDATE profile_sessions SET {sets} WHERE id = :id", {**data, "id": id})
        self._db.commit()
        return self.find_by_id(id)

    def delete(self, id: str) -> bool:
        cur = self._db.execute("DELETE FROM profile_sessions WHERE id = :id", {"id": id})
        self._db.commit()
        return (cur.rowcount or 0) > 0
# --- END GENERATED ---
