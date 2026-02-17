# --- BEGIN GENERATED ---
"""PromptVersion operation types."""

from uuid import UUID
from typing import Any
from typing import TypedDict

class PromptVersionInsert(TypedDict, total=False):
    template_id: UUID
    version: float
    content: str
    metrics: dict[str, Any]
    status: str

class PromptVersionUpdate(TypedDict, total=False):
    template_id: UUID  # optional
    version: float  # optional
    content: str  # optional
    metrics: dict[str, Any]  # optional
    status: str  # optional

class PromptVersionQuery(TypedDict, total=False):
    template_id: UUID  # optional
# --- END GENERATED ---
