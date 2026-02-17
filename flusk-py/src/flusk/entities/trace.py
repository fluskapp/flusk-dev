# --- BEGIN GENERATED ---
"""Trace entity model."""

from uuid import UUID
from datetime import datetime
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class Trace(FluskBaseModel):
    """Distributed trace records for agent workflows with aggregated cost and performance metrics"""

    organization_id: UUID = Field(description="Organization ID")
    name: str = Field(description="Trace name (e.g. agent workflow name)")
    total_cost: float = Field(description="Aggregated cost across all spans")
    total_tokens: float = Field(description="Aggregated token count")
    total_latency_ms: float = Field(description="Total latency in milliseconds")
    call_count: float = Field(description="Number of LLM calls in this trace")
    status: str = Field(description="Trace execution status")
    started_at: datetime = Field(description="When the trace began")
    completed_at: datetime | None = Field(description="When the trace completed")
# --- END GENERATED ---
