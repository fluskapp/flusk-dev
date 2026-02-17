/**
 * Python analysis generator — cost calculation and reporting.
 *
 * WHY: Produces the analysis layer that calculates costs from
 * collected spans and formats reports in markdown/JSON.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { renderAnalysisInit, renderCostAnalysis } from '../../templates/python/analysis.template.js';
import { renderReportAnalysis } from '../../templates/python/analysis-report.template.js';

const ANALYSIS_DIR = 'flusk-py/src/flusk/analysis';

interface GeneratedFile {
  path: string;
  content: string;
}

/** Generate all analysis files (cost + report) */
export async function generatePythonAnalysis(
  projectRoot: string,
): Promise<GeneratedFile[]> {
  const outDir = resolve(projectRoot, ANALYSIS_DIR);
  await mkdir(outDir, { recursive: true });

  const files: Array<[string, string]> = [
    ['__init__.py', renderAnalysisInit()],
    ['cost.py', renderCostAnalysis()],
    ['report.py', renderReportAnalysis()],
  ];

  const results: GeneratedFile[] = [];
  for (const [name, content] of files) {
    await writeFile(resolve(outDir, name), content, 'utf-8');
    results.push({ path: `${ANALYSIS_DIR}/${name}`, content });
  }

  return results;
}
