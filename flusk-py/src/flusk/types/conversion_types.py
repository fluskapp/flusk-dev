# --- BEGIN GENERATED ---
"""Conversion operation types."""

from uuid import UUID
from typing import Any
from typing import TypedDict

class ConversionInsert(TypedDict, total=False):
    pattern_id: UUID
    organization_id: UUID
    conversion_type: str
    status: str
    estimated_savings: float
    config: dict[str, Any]

class ConversionUpdate(TypedDict, total=False):
    pattern_id: UUID  # optional
    organization_id: UUID  # optional
    conversion_type: str  # optional
    status: str  # optional
    estimated_savings: float  # optional
    config: dict[str, Any]  # optional

class ConversionQuery(TypedDict, total=False):
    pattern_id: UUID  # optional
    organization_id: UUID  # optional
# --- END GENERATED ---
