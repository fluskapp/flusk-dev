/**
 * Python pricing template — provider YAML → Python pricing dict.
 *
 * WHY: Generates a typed pricing dict for each LLM provider
 * so the Python SDK can compute costs without external lookups.
 */

import type { ProviderYaml } from '../../generators/provider-yaml.types.js';

export function renderPythonPricing(cfg: ProviderYaml): string {
  const key = cfg.name.toUpperCase().replace(/-/g, '_');
  const entries = Object.entries(cfg.models)
    .map(([m, p]) => `    "${m}": {"input": ${p.input}, "output": ${p.output}},`)
    .join('\n');

  return [
    '# --- BEGIN GENERATED ---',
    `"""${cfg.displayName} pricing (USD per 1M tokens)."""`,
    '',
    '',
    `${key}_PRICING: dict[str, dict[str, float]] = {`,
    entries,
    '}',
    '# --- END GENERATED ---',
    '',
  ].join('\n');
}
