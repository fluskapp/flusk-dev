# --- BEGIN GENERATED ---
"""Tests for PromptVersion entity and repository."""

import sqlite3
import pytest
from flusk.entities.prompt_version import PromptVersion
from flusk.storage.sqlite.repositories.prompt_version_repo import PromptVersionRepository


@pytest.fixture
def db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("""CREATE TABLE IF NOT EXISTS prompt_versions (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )""")
    return conn


@pytest.fixture
def repo(db: sqlite3.Connection) -> PromptVersionRepository:
    return PromptVersionRepository(db)


class TestPromptVersionEntity:
    """PromptVersion Pydantic model tests."""

    def test_create_minimal(self) -> None:
        """Can create with required fields."""
        # TODO: fill required fields
        assert PromptVersion is not None


class TestPromptVersionRepository:
    """PromptVersion repository CRUD tests."""

    def test_insert_and_find(self, repo: PromptVersionRepository) -> None:
        data = {"id": "test-1", "created_at": "2026-01-01", "updated_at": "2026-01-01"}
        repo.insert(data)
        result = repo.find_by_id("test-1")
        assert result is not None
        assert result["id"] == "test-1"

    def test_delete(self, repo: PromptVersionRepository) -> None:
        data = {"id": "test-2", "created_at": "2026-01-01", "updated_at": "2026-01-01"}
        repo.insert(data)
        assert repo.delete("test-2") is True
        assert repo.find_by_id("test-2") is None
# --- END GENERATED ---
