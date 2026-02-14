/**
 * Render a prompt template by replacing {{variable}} placeholders
 * Pure function — no I/O, no side effects
 */

export interface RenderPromptResult {
  rendered: string;
  missingVariables: string[];
  extraVariables: string[];
}

/**
 * Replace {{var}} placeholders in content with provided variables
 */
export function renderPrompt(
  content: string,
  variables: Record<string, string>,
  declaredVariables?: string[]
): RenderPromptResult {
  const usedVars = new Set<string>();
  const missingVariables: string[] = [];

  const rendered = content.replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
    usedVars.add(varName);
    if (varName in variables) {
      return variables[varName];
    }
    missingVariables.push(varName);
    return `{{${varName}}}`;
  });

  const knownVars = declaredVariables
    ? new Set(declaredVariables)
    : usedVars;

  const extraVariables = Object.keys(variables)
    .filter((k) => !knownVars.has(k));

  return { rendered, missingVariables, extraVariables };
}
