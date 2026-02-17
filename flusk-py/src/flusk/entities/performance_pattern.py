# --- BEGIN GENERATED ---
"""PerformancePattern entity model."""

from uuid import UUID
from typing import Any
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class PerformancePattern(FluskBaseModel):
    """Detected performance patterns from profiling data combined with LLM call analysis"""

    profile_session_id: UUID = Field(description="FK to profile_sessions")
    pattern: str = Field(description="Pattern type name")
    severity: str = Field(description="Severity level of the pattern")
    description: str = Field(description="Human-readable description")
    suggestion: str = Field(description="Actionable suggestion for the developer")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Extra context (hotspot data, llm call ids)")
    organization_id: str | None = Field(description="Organization ID for multi-tenant", min_length=1)
# --- END GENERATED ---
