# --- BEGIN GENERATED ---
"""Trace operation types."""

from uuid import UUID
from datetime import datetime
from typing import TypedDict

class TraceInsert(TypedDict, total=False):
    organization_id: UUID
    name: str
    total_cost: float
    total_tokens: float
    total_latency_ms: float
    call_count: float
    status: str
    started_at: datetime
    completed_at: datetime  # optional

class TraceUpdate(TypedDict, total=False):
    organization_id: UUID  # optional
    name: str  # optional
    total_cost: float  # optional
    total_tokens: float  # optional
    total_latency_ms: float  # optional
    call_count: float  # optional
    status: str  # optional
    started_at: datetime  # optional
    completed_at: datetime  # optional

class TraceQuery(TypedDict, total=False):
    organization_id: UUID  # optional
# --- END GENERATED ---
