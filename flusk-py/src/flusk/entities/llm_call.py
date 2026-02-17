# --- BEGIN GENERATED ---
"""LLMCall entity model."""

from typing import Any
from pydantic import Field
from flusk.entities.base import FluskBaseModel

class LLMCall(FluskBaseModel):
    """A single LLM API call with cost tracking and deduplication"""

    provider: str = Field(description="LLM provider name (e.g., openai, anthropic, cohere)", min_length=1)
    model: str = Field(description="Model identifier (e.g., gpt-4, claude-3-opus)", min_length=1)
    prompt: str = Field(description="Full prompt text sent to the LLM")
    prompt_hash: str = Field(description="SHA-256 hash of the prompt for deduplication", min_length=64, max_length=64)
    tokens: dict[str, Any] = Field(default_factory=dict, description="Token usage object (input, output, total)")
    cost: float = Field(default=0, description="Calculated cost in USD for this API call", ge=0)
    response: str = Field(default="", description="Full response text from the LLM")
    cached: bool = Field(default=False, description="Whether this response was served from cache")
    agent_label: str | None = Field(description="Agent label for multi-agent tracking")
    organization_id: str | None = Field(description="Organization ID for GDPR data portability and deletion", min_length=1)
    consent_given: bool = Field(default=True, description="GDPR consent flag")
    consent_purpose: str = Field(default="optimization", description="Purpose of data processing (optimization, analytics, training)")
    session_id: str | None = Field(description="Analysis session ID for filtering results by run")
# --- END GENERATED ---
