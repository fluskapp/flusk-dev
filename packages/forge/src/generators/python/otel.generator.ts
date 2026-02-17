/**
 * Python OTel generator — generates OTel setup and SQLite exporter.
 *
 * WHY: Produces the OTel integration layer that configures tracing,
 * wires up the SQLite exporter, and instruments LLM providers.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { renderOtelInit, renderOtelSetup } from '../../templates/python/otel.template.js';
import { renderSqliteExporter } from '../../templates/python/sqlite-exporter.template.js';

const OTEL_DIR = 'flusk-py/src/flusk/otel';

interface GeneratedFile {
  path: string;
  content: string;
}

/** Generate all OTel files (setup + exporter) */
export async function generatePythonOtel(
  projectRoot: string,
): Promise<GeneratedFile[]> {
  const outDir = resolve(projectRoot, OTEL_DIR);
  await mkdir(outDir, { recursive: true });

  const files: Array<[string, string]> = [
    ['__init__.py', renderOtelInit()],
    ['setup.py', renderOtelSetup()],
    ['sqlite_exporter.py', renderSqliteExporter()],
  ];

  const results: GeneratedFile[] = [];
  for (const [name, content] of files) {
    await writeFile(resolve(outDir, name), content, 'utf-8');
    results.push({ path: `${OTEL_DIR}/${name}`, content });
  }

  return results;
}
