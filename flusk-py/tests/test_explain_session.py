# --- BEGIN GENERATED ---
"""Tests for ExplainSession entity and repository."""

import sqlite3
import pytest
from flusk.entities.explain_session import ExplainSession
from flusk.storage.sqlite.repositories.explain_session_repo import ExplainSessionRepository


@pytest.fixture
def db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("""CREATE TABLE IF NOT EXISTS explain_sessions (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )""")
    return conn


@pytest.fixture
def repo(db: sqlite3.Connection) -> ExplainSessionRepository:
    return ExplainSessionRepository(db)


class TestExplainSessionEntity:
    """ExplainSession Pydantic model tests."""

    def test_create_minimal(self) -> None:
        """Can create with required fields."""
        # TODO: fill required fields
        assert ExplainSession is not None


class TestExplainSessionRepository:
    """ExplainSession repository CRUD tests."""

    def test_insert_and_find(self, repo: ExplainSessionRepository) -> None:
        data = {"id": "test-1", "created_at": "2026-01-01", "updated_at": "2026-01-01"}
        repo.insert(data)
        result = repo.find_by_id("test-1")
        assert result is not None
        assert result["id"] == "test-1"

    def test_delete(self, repo: ExplainSessionRepository) -> None:
        data = {"id": "test-2", "created_at": "2026-01-01", "updated_at": "2026-01-01"}
        repo.insert(data)
        assert repo.delete("test-2") is True
        assert repo.find_by_id("test-2") is None
# --- END GENERATED ---
