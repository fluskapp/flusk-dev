import { globSync } from 'glob';
import { readFileSync } from 'fs';
import { minimatch } from 'minimatch';

const ENFORCED_PATHS = [
  'packages/entities/src/*.entity.ts',
  'packages/types/src/*.types.ts',
  'packages/resources/src/sqlite/repositories/**/*.ts',
  'packages/execution/src/routes/**/*.ts',
  'packages/execution/src/hooks/*.ts',
];

const EXEMPT = [
  '**/index.ts',
  '**/*.test.ts',
  '**/*.d.ts',
  '**/base.entity.ts',
];

function isExempt(file: string): boolean {
  return EXEMPT.some((pattern) => minimatch(file, pattern));
}

function checkFile(file: string): string[] {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const errors: string[] = [];

  const first5 = lines.slice(0, 5).join('\n');
  if (!first5.includes('@generated')) {
    errors.push('missing @generated in first 5 lines');
  }
  if (!content.includes('// --- BEGIN GENERATED ---')) {
    errors.push('missing // --- BEGIN GENERATED --- marker');
  }
  if (!content.includes('// --- END GENERATED ---')) {
    errors.push('missing // --- END GENERATED --- marker');
  }

  return errors;
}

const files: string[] = [];
for (const pattern of ENFORCED_PATHS) {
  files.push(...globSync(pattern));
}

const uniqueFiles = [...new Set(files)].filter((f) => !isExempt(f));

const failures: { file: string; errors: string[] }[] = [];

for (const file of uniqueFiles) {
  const errors = checkFile(file);
  if (errors.length > 0) {
    failures.push({ file, errors });
  }
}

const passed = uniqueFiles.length - failures.length;

console.log(`✅ Generated enforcement check`);
console.log(`  Checked: ${uniqueFiles.length} files`);
console.log(`  Passed:  ${passed} files`);
console.log(`  Failed:  ${failures.length} files`);

if (failures.length > 0) {
  console.log(`\n❌ Missing @generated markers:`);
  for (const { file, errors } of failures) {
    console.log(`  - ${file} (${errors.join(', ')})`);
  }
  console.log(`\nTo fix: run \`flusk sync\` or \`flusk generate entity <name>\``);
  process.exit(1);
}
