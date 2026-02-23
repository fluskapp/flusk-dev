/**
 * Render functions for pipeline code generation.
 */

import type { PipelineSchema, PipelineStep } from './pipeline.types.js';
import { toKebab, toPascal, resolveRef, safeType } from './pipeline-helpers.js';

/** Generate input type interface */
export function renderInputType(
  name: string,
  input: Record<string, { type: string; description?: string }>,
): string {
  const pascal = toPascal(name);
  const fields = Object.entries(input)
    .map(([k, v]) => `  ${k}: ${safeType(v.type)};`)
    .join('\n');
  return `export interface ${pascal}Input {\n${fields}\n}`;
}

/** Generate output type interface */
export function renderOutputType(
  name: string,
  output: PipelineSchema['output'],
): string {
  const pascal = toPascal(name);
  if (!output.fields) return `export type ${pascal}Output = ${safeType(output.type)};`;
  const fields = Object.entries(output.fields)
    .map(([k, v]) => `  ${k}: ${safeType(v.type)};`)
    .join('\n');
  return `export interface ${pascal}Output {\n${fields}\n}`;
}

/** Render a single step */
export function renderStep(step: PipelineStep): string {
  const lines: string[] = [];
  lines.push(`  // Step: ${step.id}`);

  if (step.fn) {
    const argValues = Object.values(step.args || {})
      .map((v) => resolveRef(v));
    lines.push(
      `  const ${step.output} = ${step.fn.replace(/\./g, '_')}(${argValues.join(', ')});`,
    );
  } else if (step.pipeline) {
    const fnAlias = `${step.pipeline}_fn`;
    const argEntries = Object.entries(step.args || {});
    const argStr = argEntries
      .map(([k, v]) => `${k}: ${resolveRef(v)}`)
      .join(', ');
    lines.push(
      `  const ${step.output} = ${fnAlias}({ ${argStr} });`,
    );
  } else if (step.expr) {
    const resolved = resolveRef(step.expr);
    lines.push(`  const ${step.output} = ${resolved.trim()};`);
  } else if (step.value) {
    const entries = Object.entries(step.value)
      .map(([k, v]) => `    ${k}: ${resolveRef(v)},`)
      .join('\n');
    lines.push(`  return {\n${entries}\n  };`);
  }

  if (step.output && !step.value) {
    lines.push(
      `  log.debug({ step: '${step.id}' }, '${step.id} complete');`,
    );
  }

  return lines.join('\n');
}

/** Extract function imports needed by steps */
export function extractImports(steps: PipelineStep[]): string[] {
  const imports: string[] = [];
  for (const step of steps) {
    if (step.fn) {
      const parts = step.fn.split('.');
      const fnName = parts[parts.length - 1];
      const ns = parts.slice(0, -1).filter(p => p !== 'primitives').join('/');
      imports.push(
        `import { ${fnName} as ${step.fn.replace(/\./g, '_')} } from '../primitives/${ns}/${toKebab(fnName)}.function.js';`,
      );
    }
    if (step.pipeline) {
      const fnAlias = `${step.pipeline}_fn`;
      imports.push(
        `import { ${step.pipeline} as ${fnAlias} } from './${toKebab(step.pipeline)}.pipeline.js';`,
      );
    }
  }
  return [...new Set(imports)];
}
