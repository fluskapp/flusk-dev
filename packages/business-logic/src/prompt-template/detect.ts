/**
 * Detect prompt templates from runtime LLM calls.
 * Groups calls by normalized prompt prefix and extracts {{var}} patterns.
 */

import { getLogger } from '@flusk/logger';

const log = getLogger().child({ module: 'prompt-template' });

export interface PromptCall {
  prompt: string;
  model: string;
}

export interface DetectedTemplate {
  prefix: string;
  variables: string[];
  callCount: number;
  models: string[];
}

const VARIABLE_RE = /\{\{(\w+)\}\}/g;
const MIN_PREFIX_LEN = 20;
const MIN_CALLS_FOR_TEMPLATE = 3;

/** Detect templates from a list of prompt calls. */
export function detectTemplates(calls: PromptCall[]): DetectedTemplate[] {
  const prefixMap = new Map<string, { calls: number; models: Set<string>; vars: Set<string> }>();

  for (const call of calls) {
    const prefix = normalizePrefix(call.prompt);
    if (prefix.length < MIN_PREFIX_LEN) continue;

    const entry = prefixMap.get(prefix) ?? { calls: 0, models: new Set(), vars: new Set() };
    entry.calls++;
    entry.models.add(call.model);

    for (const match of call.prompt.matchAll(VARIABLE_RE)) {
      entry.vars.add(match[1]);
    }

    prefixMap.set(prefix, entry);
  }

  const templates: DetectedTemplate[] = [];
  for (const [prefix, entry] of prefixMap) {
    if (entry.calls < MIN_CALLS_FOR_TEMPLATE) continue;
    templates.push({
      prefix,
      variables: [...entry.vars],
      callCount: entry.calls,
      models: [...entry.models],
    });
  }

  log.debug({ count: templates.length }, 'Templates detected');
  return templates.sort((a, b) => b.callCount - a.callCount);
}

/** Normalize prompt to a prefix for grouping. */
function normalizePrefix(prompt: string): string {
  return prompt
    .replace(VARIABLE_RE, '{{*}}')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
