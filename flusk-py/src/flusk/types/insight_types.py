# --- BEGIN GENERATED ---
"""Type definitions for Insight entity."""

from typing import Literal

from pydantic import BaseModel, Field

InsightCategory = Literal[
    "cost-hotspot", "duplicate-calls", "token-waste",
    "model-downgrade", "caching-opportunity", "error-rate",
]

InsightSeverity = Literal["critical", "high", "medium", "low"]


class InsightInsert(BaseModel):
    """Insert schema for Insight."""

    session_id: str
    category: InsightCategory
    severity: InsightSeverity
    title: str = Field(min_length=1)
    description: str
    current_cost: float = Field(default=0, ge=0)
    projected_cost: float = Field(default=0, ge=0)
    savings_percent: float = Field(default=0, ge=0)
    code_suggestion: str | None = None
    provider: str
    model: str


class InsightQuery(BaseModel):
    """Query schema for Insight."""

    session_id: str | None = None
    category: InsightCategory | None = None
    severity: InsightSeverity | None = None
# --- END GENERATED ---
