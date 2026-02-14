/** @generated —
 * Package generator - creates a new monorepo package
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface PackageResult {
  files: string[];
}

/**
 * Generate a new package with standard structure
 */
export async function generatePackage(name: string): Promise<PackageResult> {
  const root = process.cwd();
  const pkgDir = resolve(root, `packages/${name}`);
  const srcDir = resolve(pkgDir, 'src');
  const files: string[] = [];

  if (existsSync(pkgDir)) {
    throw new Error(`Package directory already exists: packages/${name}`);
  }

  await mkdir(srcDir, { recursive: true });

  // package.json
  await writeFile(resolve(pkgDir, 'package.json'), JSON.stringify({
    name: `@flusk/${name}`,
    version: '0.1.0',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
      clean: 'rm -rf dist',
    },
    dependencies: {},
    devDependencies: {
      typescript: '^5.7.0',
    },
  }, null, 2) + '\n', 'utf-8');
  files.push(`packages/${name}/package.json`);

  // tsconfig.json
  const tsconfig = {
    extends: '../../tsconfig.json',
    compilerOptions: { outDir: './dist', rootDir: './src' },
    include: ['src'],
  };
  await writeFile(resolve(pkgDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n', 'utf-8');
  files.push(`packages/${name}/tsconfig.json`);

  // src/index.ts
  await writeFile(resolve(srcDir, 'index.ts'),
    `/**\n * @flusk/${name} — barrel exports\n */\n`, 'utf-8');
  files.push(`packages/${name}/src/index.ts`);

  // src/config.ts
  await writeFile(resolve(srcDir, 'config.ts'), generateConfigTemplate(name), 'utf-8');
  files.push(`packages/${name}/src/config.ts`);

  // README.md
  await writeFile(resolve(pkgDir, 'README.md'),
    `# @flusk/${name}\n\nTODO: Describe this package.\n`, 'utf-8');
  files.push(`packages/${name}/README.md`);

  return { files };
}

/** Generate a config template with env var pattern */
function generateConfigTemplate(name: string): string {
  const envPrefix = name.toUpperCase().replace(/-/g, '_');
  return `/**
 * Configuration for @flusk/${name}
 * Reads from environment variables with ${envPrefix}_ prefix
 */

export interface ${toPascal(name)}Config {
  /** Enable this package */
  enabled: boolean;
}

/** Load config from environment */
export function load${toPascal(name)}Config(): ${toPascal(name)}Config {
  return {
    enabled: process.env.${envPrefix}_ENABLED !== 'false',
  };
}
`;
}

function toPascal(str: string): string {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}
