# --- BEGIN GENERATED ---
"""Insight entity model."""

from pydantic import Field
from flusk.entities.base import FluskBaseModel

class Insight(FluskBaseModel):
    """AI-generated optimization insight from flusk explain"""

    session_id: str = Field(description="Explain session ID this insight belongs to")
    category: str = Field(description="Insight category")
    severity: str = Field(description="Severity level")
    title: str = Field(description="Short title of the insight", min_length=1)
    description: str = Field(description="Detailed explanation of the insight")
    provider: str = Field(description="LLM provider related to this insight")
    model: str = Field(description="LLM model related to this insight")
    current_cost: float = Field(default=0, description="Current cost in USD", ge=0)
    projected_cost: float = Field(default=0, description="Projected cost after optimization in USD", ge=0)
    savings_percent: float = Field(default=0, description="Estimated savings percentage", ge=0)
    code_suggestion: str | None = Field(description="Optional code suggestion for the optimization")
# --- END GENERATED ---
