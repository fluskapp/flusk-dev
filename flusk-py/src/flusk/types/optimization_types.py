# --- BEGIN GENERATED ---
"""Optimization operation types."""

from uuid import UUID
from typing import TypedDict

class OptimizationInsert(TypedDict, total=False):
    organization_id: UUID
    optimization_type: str
    title: str
    description: str
    estimated_savings_per_month: float
    generated_code: str
    language: str
    status: str
    source_pattern_id: UUID  # optional

class OptimizationUpdate(TypedDict, total=False):
    organization_id: UUID  # optional
    optimization_type: str  # optional
    title: str  # optional
    description: str  # optional
    estimated_savings_per_month: float  # optional
    generated_code: str  # optional
    language: str  # optional
    status: str  # optional
    source_pattern_id: UUID  # optional

class OptimizationQuery(TypedDict, total=False):
    organization_id: UUID  # optional
# --- END GENERATED ---
