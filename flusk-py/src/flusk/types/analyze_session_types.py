# --- BEGIN GENERATED ---
"""AnalyzeSession operation types."""

from typing import Any
from datetime import datetime
from typing import TypedDict

class AnalyzeSessionInsert(TypedDict, total=False):
    script: str
    duration_ms: int
    total_calls: int
    total_cost: float
    models_used: dict[str, Any]
    started_at: datetime
    completed_at: datetime  # optional

class AnalyzeSessionUpdate(TypedDict, total=False):
    script: str  # optional
    duration_ms: int  # optional
    total_calls: int  # optional
    total_cost: float  # optional
    models_used: dict[str, Any]  # optional
    started_at: datetime  # optional
    completed_at: datetime  # optional

class AnalyzeSessionQuery(TypedDict, total=False):
    pass
# --- END GENERATED ---
