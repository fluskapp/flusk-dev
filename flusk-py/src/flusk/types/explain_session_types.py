# --- BEGIN GENERATED ---
"""Type definitions for ExplainSession entity."""

from pydantic import BaseModel, Field


class ExplainSessionInsert(BaseModel):
    """Insert schema for ExplainSession."""

    analyze_session_id: str
    llm_provider: str
    llm_model: str
    prompt_tokens: int = Field(default=0, ge=0)
    completion_tokens: int = Field(default=0, ge=0)
    explain_cost: float = Field(default=0, ge=0)
    insights_count: int = Field(default=0, ge=0)
    total_savings: float = Field(default=0, ge=0)


class ExplainSessionQuery(BaseModel):
    """Query schema for ExplainSession."""

    analyze_session_id: str | None = None
# --- END GENERATED ---
