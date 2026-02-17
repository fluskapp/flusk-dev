# --- BEGIN GENERATED ---
"""Conversion entity model."""

from uuid import UUID
from typing import Any
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class Conversion(FluskBaseModel):
    """Optimization suggestions for LLM usage - converting wasteful API calls into deterministic automation"""

    pattern_id: UUID = Field(description="Reference to the pattern this conversion applies to")
    organization_id: UUID = Field(description="Organization that owns this conversion")
    conversion_type: str = Field(description="Type of optimization (cache identical prompts, use cheaper model, or eliminate call)")
    status: str = Field(description="Lifecycle state of the conversion suggestion")
    estimated_savings: float = Field(description="Projected monthly savings in USD if accepted", ge=0)
    config: dict[str, Any] = Field(description="Type-specific configuration (cache TTL, model swap details, or removal reason)")
# --- END GENERATED ---
