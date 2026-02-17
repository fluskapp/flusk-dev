# --- BEGIN GENERATED ---
"""ModelPerformance entity model."""

from pydantic import Field
from flusk.entities.base import FluskBaseModel

class ModelPerformance(FluskBaseModel):
    """Tracks model quality/cost per prompt category - self-improving routing table"""

    model: str = Field(description="Model identifier (e.g., gpt-4o-mini)", min_length=1)
    prompt_category: str = Field(description="Complexity category (simple, medium, complex)", min_length=1)
    avg_quality: float = Field(description="Average quality score (0-1) for this model+category", ge=0, le=1)
    avg_latency_ms: float = Field(description="Average latency in milliseconds", ge=0)
    avg_cost_per1k_tokens: float = Field(description="Average cost per 1k tokens in USD", ge=0)
    sample_count: int = Field(description="Number of samples used to compute averages", ge=0)
# --- END GENERATED ---
