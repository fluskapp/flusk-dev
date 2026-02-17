/**
 * Python instrumentation template — header + patch function.
 *
 * WHY: Top half of instrumentation template, kept under 100 lines.
 */

import type { ProviderYaml } from '../../generators/provider-yaml.types.js';

export function renderInstrHeader(cfg: ProviderYaml): string {
  const key = cfg.name.toUpperCase().replace(/-/g, '_');
  const method = cfg.methods[0];
  const pyImport = cfg.sdkPackage.replace(/@/g, '').replace(/[/-]/g, '_');
  const fnName = cfg.name.replace(/-/g, '_');

  return [
    '# --- BEGIN GENERATED ---',
    `"""${cfg.displayName} SDK instrumentation — gen_ai.* OTel spans."""`,
    '',
    'from __future__ import annotations',
    '',
    'import importlib',
    'from typing import Any',
    '',
    'from opentelemetry import trace',
    'from opentelemetry.trace import SpanKind, StatusCode',
    '',
    `TRACER_NAME = "flusk-${cfg.name}"`,
    `_${key}_PATCHED = False`,
    '',
    '',
    `def patch_${fnName}() -> None:`,
    `    """Monkey-patch ${cfg.displayName} SDK to emit OTel spans."""`,
    `    global _${key}_PATCHED`,
    `    if _${key}_PATCHED:`,
    '        return',
    '    try:',
    `        mod = importlib.import_module("${pyImport}")`,
    '    except ImportError:',
    '        return',
    `    _patch_method(mod, "${method.name}")`,
    `    _${key}_PATCHED = True`,
    '',
    '',
    'def _patch_method(mod: Any, method_path: str) -> None:',
    '    parts = method_path.rsplit(".", 1)',
    '    parent = mod if len(parts) == 1 else _resolve(mod, parts[0])',
    '    name = parts[-1]',
    '    original = getattr(parent, name, None)',
    '    if original is None or getattr(original, "_flusk", False):',
    '        return',
    '',
    '    def patched(self: Any, *a: Any, **kw: Any) -> Any:',
    '        tracer = trace.get_tracer(TRACER_NAME)',
    '        model = kw.get("model") or (a[0] if a else "unknown")',
    `        with tracer.start_as_current_span(`,
    `            f"${cfg.name} {model}", kind=SpanKind.CLIENT,`,
    '        ) as span:',
    `            span.set_attribute("gen_ai.system", "${cfg.spans.system}")`,
    '            span.set_attribute("gen_ai.request.model", str(model))',
    '            try:',
    '                result = original(self, *a, **kw)',
    `                if kw.get("${method.streamParam}"):`,
    '                    return _wrap_stream(result, span)',
    '                _set_response(span, result)',
    '                return result',
    '            except Exception as exc:',
    '                span.set_status(StatusCode.ERROR, str(exc))',
    '                raise',
    '',
    '    patched._flusk = True  # type: ignore[attr-defined]',
    '    setattr(parent, name, patched)',
    '',
    '',
  ].join('\n');
}
