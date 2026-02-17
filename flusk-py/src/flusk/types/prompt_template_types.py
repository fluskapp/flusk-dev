# --- BEGIN GENERATED ---
"""PromptTemplate operation types."""

from uuid import UUID
from typing import Any
from typing import TypedDict

class PromptTemplateInsert(TypedDict, total=False):
    organization_id: UUID
    name: str
    description: str
    active_version_id: UUID  # optional
    variables: dict[str, Any]

class PromptTemplateUpdate(TypedDict, total=False):
    organization_id: UUID  # optional
    name: str  # optional
    description: str  # optional
    active_version_id: UUID  # optional
    variables: dict[str, Any]  # optional

class PromptTemplateQuery(TypedDict, total=False):
    organization_id: UUID  # optional
# --- END GENERATED ---
