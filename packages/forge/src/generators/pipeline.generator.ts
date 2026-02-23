/**
 * Pipeline generator — reads .pipeline.yaml and emits TypeScript
 * pipeline functions with typed I/O, step execution, and logging.
 *
 * Pipelines compose registered functions and other pipelines into
 * multi-step business logic. Each step can:
 * - Call a registered function (fn: namespace.name)
 * - Call another pipeline (pipeline: name)
 * - Evaluate an inline expression (expr: "...")
 * - Return a value (value: { ... })
 */

import { resolve } from 'node:path';
import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { parse } from 'yaml';

export interface PipelineStep {
  id: string;
  fn?: string;
  pipeline?: string;
  expr?: string;
  value?: Record<string, unknown>;
  args?: Record<string, unknown>;
  output?: string;
}

export interface PipelineField {
  type: string;
  description?: string;
}

export interface PipelineSchema {
  name: string;
  namespace: string;
  description: string;
  package: string;
  input: Record<string, { type: string; description?: string }>;
  output: {
    type: string;
    fields?: Record<string, PipelineField>;
  };
  steps: PipelineStep[];
  tests?: Array<{
    name: string;
    input: Record<string, unknown>;
    expected: unknown;
  }>;
}

export interface PipelineGenResult {
  files: Array<{ path: string; action: string }>;
}

function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function toPascal(s: string): string {
  return s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

/** Load a pipeline YAML */
export async function loadPipelineSchema(
  yamlPath: string,
): Promise<PipelineSchema> {
  const raw = await readFile(yamlPath, 'utf-8');
  return parse(raw) as PipelineSchema;
}

/** Resolve $variable references in step args/exprs */
function resolveRef(val: unknown): string {
  if (typeof val !== 'string') return JSON.stringify(val);
  const s = val.trim();
  // If starts with $ it's a variable reference
  if (s.startsWith('$')) {
    return s.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, (_, ref) => ref);
  }
  // If it looks like an expression (contains operators, parens, brackets, dots)
  if (/[()[\]{}<>+\-*/%=!&|?:,.]/.test(s) || s.startsWith('[') || s.startsWith('{')) {
    return s.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, (_, ref) => ref);
  }
  // Plain string → wrap in quotes
  return `'${s}'`;
}

/** Map complex types to any for generated code (no external imports) */
function safeType(t: string): string {
  // Keep primitives and simple generics; replace custom types with any
  if (/^(string|number|boolean|void|null|undefined|unknown|any)$/.test(t)) return t;
  if (/^Record</.test(t)) return t.replace(/[A-Z][A-Za-z]+(?=[>\],\s}])/g, 'any');
  if (/\[]$/.test(t)) return 'any[]';
  return 'any';
}

/** Generate input type interface */
function renderInputType(
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
function renderOutputType(
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
function renderStep(step: PipelineStep): string {
  const lines: string[] = [];
  lines.push(`  // Step: ${step.id}`);

  if (step.fn) {
    // Function call step — positional args in YAML order
    const argValues = Object.values(step.args || {})
      .map((v) => resolveRef(v));
    lines.push(
      `  const ${step.output} = ${step.fn.replace(/\./g, '_')}(${argValues.join(', ')});`,
    );
  } else if (step.pipeline) {
    // Sub-pipeline call — pass as object (pipelines take named input)
    const fnAlias = `${step.pipeline}_fn`;
    const argEntries = Object.entries(step.args || {});
    const argStr = argEntries
      .map(([k, v]) => `${k}: ${resolveRef(v)}`)
      .join(', ');
    lines.push(
      `  const ${step.output} = ${fnAlias}({ ${argStr} });`,
    );
  } else if (step.expr) {
    // Inline expression
    const resolved = resolveRef(step.expr);
    lines.push(`  const ${step.output} = ${resolved.trim()};`);
  } else if (step.value) {
    // Return value mapping
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
function extractImports(steps: PipelineStep[]): string[] {
  const imports: string[] = [];
  for (const step of steps) {
    if (step.fn) {
      // e.g. primitives.cost.aggregateCost → import aggregateCost
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
  // Dedupe
  return [...new Set(imports)];
}

/** Generate the full pipeline file */
export function generatePipelineCode(schema: PipelineSchema): string {
  const pascal = toPascal(schema.name);
  const inputType = renderInputType(schema.name, schema.input);
  const outputType = renderOutputType(schema.name, schema.output);
  const imports = extractImports(schema.steps);
  const steps = schema.steps.map(renderStep).join('\n\n');

  return `/**
 * @generated by @flusk/forge — pipeline generator
 * ${schema.description}
 * Source: packages/schema/pipelines/${toKebab(schema.name)}.pipeline.yaml
 */

// --- BEGIN GENERATED (do not edit) ---
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck — generated pipeline with dynamic types
import { getLogger } from '@flusk/logger';
${imports.join('\n')}

const log = getLogger().child({ pipeline: '${schema.name}' });

${inputType}

${outputType}

export function ${schema.name}(input: ${pascal}Input): ${pascal}Output {
  log.debug({ pipeline: '${schema.name}' }, 'pipeline start');

${steps}
}
// --- END GENERATED ---
`;
}

/** Generate test file */
export function generatePipelineTest(schema: PipelineSchema): string {
  const pascal = toPascal(schema.name);
  const tests = (schema.tests || [])
    .map(
      (t) => `  it('${t.name}', () => {
    const result = ${schema.name}(${JSON.stringify(t.input)} as unknown as ${pascal}Input);
    expect(result).toEqual(${JSON.stringify(t.expected)});
  });`,
    )
    .join('\n\n');

  return `/**
 * @generated by @flusk/forge — pipeline generator (test)
 */
import { describe, it, expect } from 'vitest';
import { ${schema.name} } from '../${toKebab(schema.name)}.pipeline.js';
import type { ${pascal}Input } from '../${toKebab(schema.name)}.pipeline.js';

describe('${schema.name} pipeline', () => {
${tests}
});
`;
}

/** Main: generate pipeline from YAML path */
export async function generatePipeline(
  yamlPath: string,
  rootDir: string,
): Promise<PipelineGenResult> {
  const schema = await loadPipelineSchema(yamlPath);
  const kebab = toKebab(schema.name);
  const nsDir = resolve(
    rootDir,
    'packages',
    schema.package,
    'src',
    schema.namespace,
  );
  await mkdir(nsDir, { recursive: true });

  const code = generatePipelineCode(schema);
  const codePath = resolve(nsDir, `${kebab}.pipeline.ts`);
  await writeFile(codePath, code);

  const files: PipelineGenResult['files'] = [
    { path: codePath, action: 'created' },
  ];

  if (schema.tests && schema.tests.length > 0) {
    const testDir = resolve(nsDir, '__tests__');
    await mkdir(testDir, { recursive: true });
    const testCode = generatePipelineTest(schema);
    const testPath = resolve(testDir, `${kebab}.pipeline.test.ts`);
    await writeFile(testPath, testCode);
    files.push({ path: testPath, action: 'created' });
  }

  return { files };
}

/** Generate all pipelines from a directory */
export async function generateAllPipelines(
  pipelinesDir: string,
  rootDir: string,
): Promise<PipelineGenResult> {
  const allFiles: PipelineGenResult['files'] = [];

  let entries: string[];
  try {
    entries = await readdir(pipelinesDir);
  } catch {
    return { files: [] };
  }

  const yamls = entries.filter((f) => f.endsWith('.pipeline.yaml'));

  for (const yaml of yamls) {
    const result = await generatePipeline(
      resolve(pipelinesDir, yaml),
      rootDir,
    );
    allFiles.push(...result.files);
  }

  return { files: allFiles };
}
