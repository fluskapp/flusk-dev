# --- BEGIN GENERATED ---
"""Insight operation types."""

from typing import TypedDict

class InsightInsert(TypedDict, total=False):
    session_id: str
    category: str
    severity: str
    title: str
    description: str
    current_cost: float
    projected_cost: float
    savings_percent: float
    code_suggestion: str  # optional
    provider: str
    model: str

class InsightUpdate(TypedDict, total=False):
    session_id: str  # optional
    category: str  # optional
    severity: str  # optional
    title: str  # optional
    description: str  # optional
    current_cost: float  # optional
    projected_cost: float  # optional
    savings_percent: float  # optional
    code_suggestion: str  # optional
    provider: str  # optional
    model: str  # optional

class InsightQuery(TypedDict, total=False):
    session_id: str  # optional
# --- END GENERATED ---
