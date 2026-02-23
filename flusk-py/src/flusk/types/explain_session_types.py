# --- BEGIN GENERATED ---
"""ExplainSession operation types."""

from typing import TypedDict

class ExplainSessionInsert(TypedDict, total=False):
    analyze_session_id: str
    llm_provider: str
    llm_model: str
    prompt_tokens: int
    completion_tokens: int
    explain_cost: float
    insights_count: int
    total_savings: float

class ExplainSessionUpdate(TypedDict, total=False):
    analyze_session_id: str  # optional
    llm_provider: str  # optional
    llm_model: str  # optional
    prompt_tokens: int  # optional
    completion_tokens: int  # optional
    explain_cost: float  # optional
    insights_count: int  # optional
    total_savings: float  # optional

class ExplainSessionQuery(TypedDict, total=False):
    analyze_session_id: str  # optional
# --- END GENERATED ---
