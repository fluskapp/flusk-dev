/**
 * Python CLI generator — generates click-based CLI commands.
 *
 * WHY: Produces the complete CLI structure for flusk-py,
 * including analyze, report, history, and purge commands.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { renderMainCli, renderAnalyzeCli } from '../../templates/python/cli.template.js';
import { renderReportCli, renderHistoryCli, renderPurgeCli } from '../../templates/python/cli-commands.template.js';

const CLI_DIR = 'flusk-py/src/flusk/cli';

interface GeneratedFile {
  path: string;
  content: string;
}

/** Generate all CLI command files */
export async function generatePythonCli(
  projectRoot: string,
): Promise<GeneratedFile[]> {
  const outDir = resolve(projectRoot, CLI_DIR);
  await mkdir(outDir, { recursive: true });

  const files: Array<[string, string]> = [
    ['__init__.py', '# --- BEGIN GENERATED ---\n"""Flusk CLI commands."""\n# --- END GENERATED ---\n'],
    ['main.py', renderMainCli()],
    ['analyze.py', renderAnalyzeCli()],
    ['report.py', renderReportCli()],
    ['history.py', renderHistoryCli()],
    ['purge.py', renderPurgeCli()],
  ];

  const results: GeneratedFile[] = [];
  for (const [name, content] of files) {
    await writeFile(resolve(outDir, name), content, 'utf-8');
    results.push({ path: `${CLI_DIR}/${name}`, content });
  }

  return results;
}
