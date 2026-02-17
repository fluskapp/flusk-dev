# --- BEGIN GENERATED ---
"""PerformancePattern operation types."""

from uuid import UUID
from typing import Any
from typing import TypedDict

class PerformancePatternInsert(TypedDict, total=False):
    profile_session_id: UUID
    pattern: str
    severity: str
    description: str
    suggestion: str
    metadata: dict[str, Any]
    organization_id: str  # optional

class PerformancePatternUpdate(TypedDict, total=False):
    profile_session_id: UUID  # optional
    pattern: str  # optional
    severity: str  # optional
    description: str  # optional
    suggestion: str  # optional
    metadata: dict[str, Any]  # optional
    organization_id: str  # optional

class PerformancePatternQuery(TypedDict, total=False):
    profile_session_id: UUID  # optional
# --- END GENERATED ---
