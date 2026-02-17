# --- BEGIN GENERATED ---
"""Span entity model."""

from uuid import UUID
from datetime import datetime
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class Span(FluskBaseModel):
    """Individual spans within a distributed trace - tracks LLM calls, tools, retrievals, and chains"""

    trace_id: UUID = Field(description="Parent trace ID")
    span_type: str = Field(description="Span type")
    name: str = Field(description="Span name (e.g. step name)")
    cost: float = Field(description="Cost for this span")
    tokens: float = Field(description="Token count for this span")
    latency_ms: float = Field(description="Latency in milliseconds")
    status: str = Field(description="Span execution status")
    started_at: datetime = Field(description="When the span started")
    parent_span_id: UUID | None = Field(description="Parent span ID for nested spans")
    input: str | None = Field(description="Input data")
    output: str | None = Field(description="Output data")
    completed_at: datetime | None = Field(description="When the span completed")
# --- END GENERATED ---
