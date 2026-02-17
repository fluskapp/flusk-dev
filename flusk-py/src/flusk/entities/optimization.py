# --- BEGIN GENERATED ---
"""Optimization entity model."""

from uuid import UUID
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class Optimization(FluskBaseModel):
    """Generated code optimization suggestions for LLM usage patterns"""

    organization_id: UUID = Field(description="Organization that owns this optimization")
    optimization_type: str = Field(description="Type of optimization")
    title: str = Field(description="Human-readable title")
    description: str = Field(description="Detailed description of the optimization")
    estimated_savings_per_month: float = Field(description="Estimated monthly savings in USD", ge=0)
    generated_code: str = Field(description="Generated code snippet implementing the optimization")
    language: str = Field(description="Language of the generated code")
    status: str = Field(description="Current status of the optimization")
    source_pattern_id: UUID | None = Field(description="Pattern that triggered this optimization (nullable)")
# --- END GENERATED ---
