/**
 * Python package recipe — CLI, OTel, and analysis steps.
 *
 * WHY: Generates the CLI commands, OTel setup, SQLite exporter,
 * and analysis modules for flusk-py. Extracted to keep each
 * recipe file under 100 lines.
 */

import type { RecipeStep, StepResult } from './recipe.types.js';
import { generatePythonCli } from '../generators/python/cli.generator.js';
import { generatePythonOtel } from '../generators/python/otel.generator.js';
import { generatePythonAnalysis } from '../generators/python/analysis.generator.js';

export const cliStep: RecipeStep = {
  name: 'cli-commands',
  description: 'Generate Python CLI commands (click)',
  async run(ctx): Promise<StepResult> {
    const results = await generatePythonCli(ctx.projectRoot);
    return { files: results.map((r) => ({ path: r.path, action: 'created' })) };
  },
};

export const otelStep: RecipeStep = {
  name: 'otel-setup',
  description: 'Generate OTel setup + SQLite exporter',
  async run(ctx): Promise<StepResult> {
    const results = await generatePythonOtel(ctx.projectRoot);
    return { files: results.map((r) => ({ path: r.path, action: 'created' })) };
  },
};

export const analysisStep: RecipeStep = {
  name: 'analysis',
  description: 'Generate cost analysis and reporting',
  async run(ctx): Promise<StepResult> {
    const results = await generatePythonAnalysis(ctx.projectRoot);
    return { files: results.map((r) => ({ path: r.path, action: 'created' })) };
  },
};
