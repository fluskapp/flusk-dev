# --- BEGIN GENERATED ---
"""ProfileSession entity model."""

from typing import Any
from datetime import datetime
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class ProfileSession(FluskBaseModel):
    """Captures profiling session data from @platformatic/flame integration"""

    name: str = Field(description="User label for the profiling session", min_length=1)
    profile_type: str = Field(description="Profile type")
    started_at: datetime = Field(description="ISO datetime when profiling started")
    duration_ms: int = Field(default=0, description="Profiling duration in milliseconds", ge=0)
    total_samples: int = Field(default=0, description="Total samples from flame", ge=0)
    hotspots: dict[str, Any] = Field(default_factory=dict, description="Top-N hotspot functions (JSON array)")
    markdown_raw: str = Field(default="", description="Full flame markdown output")
    pprof_path: str = Field(default="", description="Path to .pb file")
    flamegraph_path: str = Field(default="", description="Path to .html file")
    trace_ids: dict[str, Any] = Field(default_factory=dict, description="Linked OTel trace IDs (JSON array)")
    organization_id: str | None = Field(description="Organization ID for multi-tenant", min_length=1)
# --- END GENERATED ---
