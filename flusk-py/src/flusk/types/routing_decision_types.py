# --- BEGIN GENERATED ---
"""RoutingDecision operation types."""

from uuid import UUID
from typing import TypedDict

class RoutingDecisionInsert(TypedDict, total=False):
    rule_id: UUID
    llm_call_id: UUID  # optional
    selected_model: str
    original_model: str
    reason: str
    cost_saved: float

class RoutingDecisionUpdate(TypedDict, total=False):
    rule_id: UUID  # optional
    llm_call_id: UUID  # optional
    selected_model: str  # optional
    original_model: str  # optional
    reason: str  # optional
    cost_saved: float  # optional

class RoutingDecisionQuery(TypedDict, total=False):
    rule_id: UUID  # optional
# --- END GENERATED ---
