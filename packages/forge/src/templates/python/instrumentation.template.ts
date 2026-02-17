/**
 * Python instrumentation template — provider YAML → OTel monkey-patch.
 *
 * WHY: Generates a Python module that wraps an LLM SDK to emit
 * OpenTelemetry gen_ai.* spans, matching the Node.js pattern.
 */

import type { ProviderYaml } from '../../generators/provider-yaml.types.js';
import { renderInstrHeader } from './instrumentation-parts.js';
import { renderInstrBody } from './instrumentation-helpers.js';

export function renderPythonInstrumentation(cfg: ProviderYaml): string {
  return renderInstrHeader(cfg) + renderInstrBody();
}
