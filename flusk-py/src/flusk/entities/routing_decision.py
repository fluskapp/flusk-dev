# --- BEGIN GENERATED ---
"""RoutingDecision entity model."""

from uuid import UUID
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class RoutingDecision(FluskBaseModel):
    """Records each routing decision and savings for analytics and cost reports"""

    rule_id: UUID = Field(description="Routing rule that triggered this decision")
    selected_model: str = Field(description="Model chosen by the router", min_length=1)
    original_model: str = Field(description="Model originally requested by the user", min_length=1)
    reason: str = Field(description="Why this model was selected (e.g., cheapest-qualifying, fallback, ab-test)")
    cost_saved: float = Field(description="Estimated cost savings in USD (can be negative if A/B test)")
    llm_call_id: UUID | None = Field(description="Associated LLM call (if tracked)")
# --- END GENERATED ---
