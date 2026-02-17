# --- BEGIN GENERATED ---
"""ModelPerformance operation types."""

from typing import TypedDict

class ModelPerformanceInsert(TypedDict, total=False):
    model: str
    prompt_category: str
    avg_quality: float
    avg_latency_ms: float
    avg_cost_per1k_tokens: float
    sample_count: int

class ModelPerformanceUpdate(TypedDict, total=False):
    model: str  # optional
    prompt_category: str  # optional
    avg_quality: float  # optional
    avg_latency_ms: float  # optional
    avg_cost_per1k_tokens: float  # optional
    sample_count: int  # optional

class ModelPerformanceQuery(TypedDict, total=False):
    model: str  # optional
    prompt_category: str  # optional
# --- END GENERATED ---
