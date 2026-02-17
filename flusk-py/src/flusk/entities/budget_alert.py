# --- BEGIN GENERATED ---
"""BudgetAlert entity model."""

from typing import Any
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class BudgetAlert(FluskBaseModel):
    """Budget threshold alert triggered when spending exceeds limits"""

    alert_type: str = Field(description="Type of budget limit that was exceeded")
    threshold: float = Field(description="The budget limit that was exceeded (USD)", ge=0)
    actual: float = Field(description="The actual spending amount (USD)", ge=0)
    model: str | None = Field(description="Model that triggered the alert (if per-call)")
    acknowledged: bool = Field(default=False, description="Whether the user acknowledged this alert")
    metadata: dict[str, Any] | None = Field(description="Additional context (agent labels, time windows, etc.)")
# --- END GENERATED ---
