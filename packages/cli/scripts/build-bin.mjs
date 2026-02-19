#!/usr/bin/env node
/**
 * Generates dist/bin/flusk.js from bin/flusk.ts with corrected import paths.
 * The source bin/flusk.ts imports from '../src/commands/...' which is correct
 * for the source layout. For dist/, imports should be '../commands/...' since
 * tsc compiles src/ directly into dist/ (rootDir=src).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');

const src = readFileSync(resolve(pkgRoot, 'bin/flusk.ts'), 'utf-8');

// Transform imports: ../src/commands/ → ../commands/, ../src/utils/ → ../utils/
const transformed = src
  .replace(/from\s+['"]\.\.\/src\//g, "from '../")
  // Remove TypeScript type-only imports if any (none expected but safe)
  .replace(/import\s+type\s+.*;\n/g, '');

mkdirSync(resolve(pkgRoot, 'dist/bin'), { recursive: true });
writeFileSync(resolve(pkgRoot, 'dist/bin/flusk.js'), transformed, 'utf-8');
console.log('✅ dist/bin/flusk.js generated with corrected imports');
