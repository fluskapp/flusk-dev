# --- BEGIN GENERATED ---
"""Span operation types."""

from uuid import UUID
from datetime import datetime
from typing import TypedDict

class SpanInsert(TypedDict, total=False):
    trace_id: UUID
    parent_span_id: UUID  # optional
    span_type: str
    name: str
    input: str  # optional
    output: str  # optional
    cost: float
    tokens: float
    latency_ms: float
    status: str
    started_at: datetime
    completed_at: datetime  # optional

class SpanUpdate(TypedDict, total=False):
    trace_id: UUID  # optional
    parent_span_id: UUID  # optional
    span_type: str  # optional
    name: str  # optional
    input: str  # optional
    output: str  # optional
    cost: float  # optional
    tokens: float  # optional
    latency_ms: float  # optional
    status: str  # optional
    started_at: datetime  # optional
    completed_at: datetime  # optional

class SpanQuery(TypedDict, total=False):
    trace_id: UUID  # optional
# --- END GENERATED ---
