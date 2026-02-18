# --- BEGIN GENERATED ---
"""ExplainSession entity model."""

from pydantic import Field
from flusk.entities.base import FluskBaseModel


class ExplainSession(FluskBaseModel):
    """Session tracking for flusk explain runs"""

    analyze_session_id: str = Field(description="ID of the analyze session that was explained")
    llm_provider: str = Field(description="LLM provider used for the explain call")
    llm_model: str = Field(description="LLM model used for the explain call")
    prompt_tokens: int = Field(default=0, description="Number of prompt tokens used", ge=0)
    completion_tokens: int = Field(default=0, description="Number of completion tokens used", ge=0)
    explain_cost: float = Field(default=0, description="Cost of the explain LLM call in USD", ge=0)
    insights_count: int = Field(default=0, description="Number of insights generated", ge=0)
    total_savings: float = Field(default=0, description="Total projected savings in USD", ge=0)
# --- END GENERATED ---
