/**
 * Python OTel setup template — configures tracing with SQLite exporter.
 *
 * WHY: Generates the OTel SDK configuration that wires up
 * the SQLite exporter and provider instrumentations.
 */

/** Render otel/__init__.py */
export function renderOtelInit(): string {
  return `# --- BEGIN GENERATED ---
"""Flusk OpenTelemetry integration."""

from flusk.otel.setup import configure_otel, shutdown_otel

__all__ = ["configure_otel", "shutdown_otel"]
# --- END GENERATED ---
`;
}

/** Render otel/setup.py */
export function renderOtelSetup(): string {
  return `# --- BEGIN GENERATED ---
"""OTel SDK setup — configures tracing with SQLite exporter."""

from __future__ import annotations

import uuid

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.resources import Resource

from flusk.otel.sqlite_exporter import SqliteSpanExporter

_provider: TracerProvider | None = None
_session_id: str = ""

SENSITIVE_HEADERS = {"authorization", "x-api-key", "api-key"}


def _sanitize_processor() -> None:
    """Register a span processor that strips sensitive attributes."""
    pass  # Sanitization happens in the exporter


def configure_otel(*, redact: bool = True) -> str:
    """Configure OTel SDK with SQLite exporter. Returns session_id."""
    global _provider, _session_id
    _session_id = str(uuid.uuid4())
    resource = Resource.create({"service.name": "flusk", "session.id": _session_id})
    _provider = TracerProvider(resource=resource)
    exporter = SqliteSpanExporter(session_id=_session_id, redact=redact)
    _provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(_provider)
    _try_instrument_providers()
    return _session_id


def _try_instrument_providers() -> None:
    """Best-effort instrument known providers."""
    try:
        from flusk.instrumentations.openai import patch_openai
        patch_openai()
    except ImportError:
        pass
    try:
        from flusk.instrumentations.anthropic import patch_anthropic
        patch_anthropic()
    except ImportError:
        pass


def shutdown_otel() -> None:
    """Flush and shutdown the OTel provider."""
    global _provider
    if _provider:
        _provider.shutdown()
        _provider = None
# --- END GENERATED ---
`;
}
