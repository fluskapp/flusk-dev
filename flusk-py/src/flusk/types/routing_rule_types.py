# --- BEGIN GENERATED ---
"""RoutingRule operation types."""

from typing import TypedDict

class RoutingRuleInsert(TypedDict, total=False):
    organization_id: str
    name: str
    quality_threshold: float
    fallback_model: str
    enabled: bool

class RoutingRuleUpdate(TypedDict, total=False):
    organization_id: str  # optional
    name: str  # optional
    quality_threshold: float  # optional
    fallback_model: str  # optional
    enabled: bool  # optional

class RoutingRuleQuery(TypedDict, total=False):
    organization_id: str  # optional
# --- END GENERATED ---
