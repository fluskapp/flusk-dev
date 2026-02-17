/**
 * Python instrumentation template — helper functions.
 *
 * WHY: Bottom half of instrumentation template (stream wrapping,
 * response attrs, resolve), kept under 100 lines.
 */

export function renderInstrBody(): string {
  return [
    'def _resolve(mod: Any, dotted: str) -> Any:',
    '    """Resolve a dotted attribute path on a module."""',
    '    obj = mod',
    '    for part in dotted.split("."):',
    '        obj = getattr(obj, part)',
    '    return obj',
    '',
    '',
    'def _wrap_stream(result: Any, span: Any) -> Any:',
    '    """Wrap an iterator to capture token usage on completion."""',
    '    def gen():',
    '        input_t = output_t = 0',
    '        for chunk in result:',
    '            usage = getattr(chunk, "usage", None)',
    '            if usage:',
    '                input_t = getattr(usage, "input_tokens", 0) or 0',
    '                output_t = getattr(usage, "output_tokens", 0) or 0',
    '            yield chunk',
    '        span.set_attribute("gen_ai.usage.input_tokens", input_t)',
    '        span.set_attribute("gen_ai.usage.output_tokens", output_t)',
    '    return gen()',
    '',
    '',
    'def _set_response(span: Any, result: Any) -> None:',
    '    """Set response attributes from an LLM API result."""',
    '    model = getattr(result, "model", None)',
    '    if model:',
    '        span.set_attribute("gen_ai.response.model", model)',
    '    usage = getattr(result, "usage", None)',
    '    if usage:',
    '        inp = getattr(usage, "input_tokens", 0) or getattr(usage, "prompt_tokens", 0)',
    '        out = getattr(usage, "output_tokens", 0) or getattr(usage, "completion_tokens", 0)',
    '        span.set_attribute("gen_ai.usage.input_tokens", inp)',
    '        span.set_attribute("gen_ai.usage.output_tokens", out)',
    '# --- END GENERATED ---',
    '',
  ].join('\n');
}
