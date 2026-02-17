# --- BEGIN GENERATED ---
"""Base entity model with id and timestamps."""

from pydantic import BaseModel, Field
from uuid import uuid4, UUID
from datetime import datetime, timezone


class FluskBaseModel(BaseModel):
    """Base model with id, created_at, updated_at."""

    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
# --- END GENERATED ---
