# --- BEGIN GENERATED ---
"""Pattern operation types."""

from uuid import UUID
from datetime import datetime
from typing import Any
from typing import TypedDict

class PatternInsert(TypedDict, total=False):
    organization_id: UUID
    prompt_hash: str
    occurrence_count: int
    first_seen_at: datetime
    last_seen_at: datetime
    sample_prompts: dict[str, Any]
    avg_cost: float
    total_cost: float
    suggested_conversion: str  # optional

class PatternUpdate(TypedDict, total=False):
    organization_id: UUID  # optional
    prompt_hash: str  # optional
    occurrence_count: int  # optional
    first_seen_at: datetime  # optional
    last_seen_at: datetime  # optional
    sample_prompts: dict[str, Any]  # optional
    avg_cost: float  # optional
    total_cost: float  # optional
    suggested_conversion: str  # optional

class PatternQuery(TypedDict, total=False):
    organization_id: UUID  # optional
    prompt_hash: str  # optional
# --- END GENERATED ---
