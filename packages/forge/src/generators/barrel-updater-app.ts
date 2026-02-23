/**
 * App registration updater — registers routes in app.ts
 */

import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

/**
 * Register new feature routes in app.ts
 */
export async function updateAppRegistration(
  entityName: string,
  root: string,
): Promise<void> {
  const filePath = resolve(root, 'packages/execution/src/app.ts');
  const existing = await readFile(filePath, 'utf-8');
  const routeFnName = `${entityName.replace(/-/g, '')}Routes`;

  if (existing.includes(routeFnName)) return;

  // Add import
  const importLine = `import { ${routeFnName} } from './routes/${entityName}.routes.js';`;
  const lastImportIdx = existing.lastIndexOf('import ');
  const lineEnd = existing.indexOf('\n', lastImportIdx);
  let updated = existing.slice(0, lineEnd + 1) +
    importLine + '\n' + existing.slice(lineEnd + 1);

  // Add route registration inside the api register block
  const registerMarker = `{ prefix: '/api/v1' }`;
  const markerIdx = updated.indexOf(registerMarker);
  if (markerIdx === -1) return;

  const closingBrace = updated.lastIndexOf('},', markerIdx);
  const insertPoint = updated.lastIndexOf('\n', closingBrace);
  const routeLine = `      await api.register(${routeFnName}, { prefix: '/${entityName}s' });`;
  updated = updated.slice(0, insertPoint) + '\n' +
    routeLine + updated.slice(insertPoint);

  await writeFile(filePath, updated, 'utf-8');
}
