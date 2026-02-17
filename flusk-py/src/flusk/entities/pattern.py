# --- BEGIN GENERATED ---
"""Pattern entity model."""

from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class Pattern(FluskBaseModel):
    """Detected repetitive prompt patterns - identifies optimization opportunities by grouping duplicate API calls"""

    organization_id: UUID = Field(description="Organization that owns this pattern")
    prompt_hash: str = Field(description="SHA-256 hash identifying the repeated prompt", min_length=64, max_length=64)
    first_seen_at: datetime = Field(description="Timestamp of first occurrence")
    last_seen_at: datetime = Field(description="Timestamp of most recent occurrence")
    avg_cost: float = Field(description="Average cost per occurrence in USD", ge=0)
    total_cost: float = Field(description="Total accumulated cost for all occurrences in USD", ge=0)
    occurrence_count: int = Field(default=1, description="Number of times this pattern has been observed", ge=1)
    sample_prompts: dict[str, Any] = Field(default_factory=dict, description="Sample prompt texts (up to 5) for review")
    suggested_conversion: str | None = Field(description="Suggested automation approach (caching, function, etc.)")
# --- END GENERATED ---
