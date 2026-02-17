# --- BEGIN GENERATED ---
"""OpenAI SDK instrumentation — gen_ai.* OTel spans."""

from __future__ import annotations

import importlib
from typing import Any

from opentelemetry import trace
from opentelemetry.trace import SpanKind, StatusCode

TRACER_NAME = "flusk-openai"
_OPENAI_PATCHED = False


def patch_openai() -> None:
    """Monkey-patch OpenAI SDK to emit OTel spans."""
    global _OPENAI_PATCHED
    if _OPENAI_PATCHED:
        return
    try:
        mod = importlib.import_module("openai")
    except ImportError:
        return
    _patch_method(mod, "chat.completions.create")
    _OPENAI_PATCHED = True


def _patch_method(mod: Any, method_path: str) -> None:
    parts = method_path.rsplit(".", 1)
    parent = mod if len(parts) == 1 else _resolve(mod, parts[0])
    name = parts[-1]
    original = getattr(parent, name, None)
    if original is None or getattr(original, "_flusk", False):
        return

    def patched(self: Any, *a: Any, **kw: Any) -> Any:
        tracer = trace.get_tracer(TRACER_NAME)
        model = kw.get("model") or (a[0] if a else "unknown")
        with tracer.start_as_current_span(
            f"openai {model}", kind=SpanKind.CLIENT,
        ) as span:
            span.set_attribute("gen_ai.system", "openai")
            span.set_attribute("gen_ai.request.model", str(model))
            try:
                result = original(self, *a, **kw)
                if kw.get("stream"):
                    return _wrap_stream(result, span)
                _set_response(span, result)
                return result
            except Exception as exc:
                span.set_status(StatusCode.ERROR, str(exc))
                raise

    patched._flusk = True  # type: ignore[attr-defined]
    setattr(parent, name, patched)

def _resolve(mod: Any, dotted: str) -> Any:
    """Resolve a dotted attribute path on a module."""
    obj = mod
    for part in dotted.split("."):
        obj = getattr(obj, part)
    return obj


def _wrap_stream(result: Any, span: Any) -> Any:
    """Wrap an iterator to capture token usage on completion."""
    def gen():
        input_t = output_t = 0
        for chunk in result:
            usage = getattr(chunk, "usage", None)
            if usage:
                input_t = getattr(usage, "input_tokens", 0) or 0
                output_t = getattr(usage, "output_tokens", 0) or 0
            yield chunk
        span.set_attribute("gen_ai.usage.input_tokens", input_t)
        span.set_attribute("gen_ai.usage.output_tokens", output_t)
    return gen()


def _set_response(span: Any, result: Any) -> None:
    """Set response attributes from an LLM API result."""
    model = getattr(result, "model", None)
    if model:
        span.set_attribute("gen_ai.response.model", model)
    usage = getattr(result, "usage", None)
    if usage:
        inp = getattr(usage, "input_tokens", 0) or getattr(usage, "prompt_tokens", 0)
        out = getattr(usage, "output_tokens", 0) or getattr(usage, "completion_tokens", 0)
        span.set_attribute("gen_ai.usage.input_tokens", inp)
        span.set_attribute("gen_ai.usage.output_tokens", out)
# --- END GENERATED ---
