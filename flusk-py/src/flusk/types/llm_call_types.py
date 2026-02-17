# --- BEGIN GENERATED ---
"""LLMCall operation types."""

from typing import Any
from typing import TypedDict

class LLMCallInsert(TypedDict, total=False):
    provider: str
    model: str
    prompt: str
    prompt_hash: str
    tokens: dict[str, Any]
    cost: float
    response: str
    cached: bool
    agent_label: str  # optional
    organization_id: str  # optional
    consent_given: bool
    consent_purpose: str
    session_id: str  # optional

class LLMCallUpdate(TypedDict, total=False):
    provider: str  # optional
    model: str  # optional
    prompt: str  # optional
    prompt_hash: str  # optional
    tokens: dict[str, Any]  # optional
    cost: float  # optional
    response: str  # optional
    cached: bool  # optional
    agent_label: str  # optional
    organization_id: str  # optional
    consent_given: bool  # optional
    consent_purpose: str  # optional
    session_id: str  # optional

class LLMCallQuery(TypedDict, total=False):
    model: str  # optional
    prompt_hash: str  # optional
    session_id: str  # optional
# --- END GENERATED ---
