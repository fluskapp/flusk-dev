# --- BEGIN GENERATED ---
"""AnalyzeSession entity model."""

from typing import Any
from datetime import datetime
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class AnalyzeSession(FluskBaseModel):
    """Tracks CLI analyze runs — created when flusk analyze executes"""

    script: str = Field(description="Script path that was analyzed", min_length=1)
    duration_ms: int = Field(description="Total analysis duration in milliseconds", ge=0)
    started_at: datetime = Field(description="ISO datetime when analysis started")
    total_calls: int = Field(default=0, description="Total LLM calls captured", ge=0)
    total_cost: float = Field(default=0, description="Total cost in USD", ge=0)
    models_used: dict[str, Any] = Field(default_factory=dict, description="List of model identifiers used (JSON array)")
    completed_at: datetime | None = Field(description="ISO datetime when analysis completed")
# --- END GENERATED ---
