# --- BEGIN GENERATED ---
"""RoutingRule entity model."""

from pydantic import Field
from flusk.entities.base import FluskBaseModel

class RoutingRule(FluskBaseModel):
    """Model routing rules per organization - routes to cheapest qualifying model"""

    organization_id: str = Field(description="Organization that owns this routing rule", min_length=1)
    name: str = Field(description="Human-readable name for this routing rule", min_length=1)
    quality_threshold: float = Field(description="Minimum quality score (0-1) required for routed model", ge=0, le=1)
    fallback_model: str = Field(description="Model to use when no cheaper model meets threshold", min_length=1)
    enabled: bool = Field(default=False, description="Whether this routing rule is active")
# --- END GENERATED ---
