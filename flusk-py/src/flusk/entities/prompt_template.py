# --- BEGIN GENERATED ---
"""PromptTemplate entity model."""

from uuid import UUID
from typing import Any
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class PromptTemplate(FluskBaseModel):
    """Prompt templates with variable placeholders for A/B testing"""

    organization_id: UUID = Field(description="Organization ID")
    name: str = Field(description="Template name")
    description: str = Field(description="Template description")
    active_version_id: UUID | None = Field(description="Currently active version ID")
    variables: dict[str, Any] = Field(default_factory=dict, description="Template variable names e.g. [\"user_query\", \"context\"]")
# --- END GENERATED ---
