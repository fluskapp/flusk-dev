# --- BEGIN GENERATED ---
"""PromptVersion entity model."""

from uuid import UUID
from typing import Any
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class PromptVersion(FluskBaseModel):
    """Immutable prompt versions with metrics tracking for A/B testing"""

    template_id: UUID = Field(description="Parent template ID")
    version: float = Field(description="Auto-increment version number per template")
    content: str = Field(description="Prompt text with {{variable}} placeholders")
    status: str = Field(description="Version lifecycle status")
    metrics: dict[str, Any] = Field(default_factory=dict, description="Performance metrics (avgQuality, avgLatencyMs, avgCost, sampleCount)")
# --- END GENERATED ---
