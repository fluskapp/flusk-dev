import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { generatePipelineCode, generatePipelineTest } from '../packages/forge/src/generators/pipeline/pipeline-codegen.js';

const require = createRequire(import.meta.url);
const YAML = require('/Users/user/projects/flusk/node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml');

const pipelinesDir = 'packages/schema/pipelines';
const outDir = 'packages/business-logic/src/analytics';
const testDir = 'packages/business-logic/src/analytics/__tests__';

const files = readdirSync(pipelinesDir).filter(f => f.endsWith('.yaml'));

for (const file of files) {
  const name = file.replace('.pipeline.yaml', '');
  const schema = YAML.load(readFileSync(resolve(pipelinesDir, file), 'utf-8'));
  const code = generatePipelineCode(schema);
  const test = generatePipelineTest(schema);
  writeFileSync(resolve(outDir, `${name}.pipeline.ts`), code);
  writeFileSync(resolve(testDir, `${name}.pipeline.test.ts`), test);
  console.log(`✓ ${name}`);
}
console.log(`\nRegenerated ${files.length} pipelines`);
