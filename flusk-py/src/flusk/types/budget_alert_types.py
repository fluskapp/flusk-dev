# --- BEGIN GENERATED ---
"""BudgetAlert operation types."""

from typing import Any
from typing import TypedDict

class BudgetAlertInsert(TypedDict, total=False):
    alert_type: str
    threshold: float
    actual: float
    model: str  # optional
    acknowledged: bool
    metadata: dict[str, Any]  # optional

class BudgetAlertUpdate(TypedDict, total=False):
    alert_type: str  # optional
    threshold: float  # optional
    actual: float  # optional
    model: str  # optional
    acknowledged: bool  # optional
    metadata: dict[str, Any]  # optional

class BudgetAlertQuery(TypedDict, total=False):
    model: str  # optional
# --- END GENERATED ---
