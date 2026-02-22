/**
 * CI enforcement: verify all entity YAMLs have up-to-date generated files
 * and generator ratio meets target.
 *
 * Usage: pnpm tsx scripts/check-schema.ts
 * Exit 0 = pass, Exit 1 = fail
 */

import { resolve } from 'node:path';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require('yaml') as { parse: (s: string) => unknown };
// Use built dist since scripts/ runs outside package context
import { detectChanges, DEFAULT_SCAN_DIRS } from '../packages/forge/dist/regeneration/index.js';
import { computeRatio } from '../packages/forge/dist/validation/index.js';

const root = resolve(import.meta.dirname, '..');
const RATIO_TARGET = 0.9; // 90%

interface CheckResult {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
}

function run(): CheckResult {
  const result: CheckResult = { passed: true, checks: [] };

  // 1. List all entity YAML files
  const entitiesDir = resolve(root, 'packages/schema/entities');
  if (!existsSync(entitiesDir)) {
    result.passed = false;
    result.checks.push({
      name: 'entities-dir',
      passed: false,
      detail: 'packages/schema/entities/ not found',
    });
    return result;
  }

  const yamlFiles = readdirSync(entitiesDir)
    .filter((f) => f.endsWith('.entity.yaml'));

  result.checks.push({
    name: 'yaml-count',
    passed: yamlFiles.length > 0,
    detail: `Found ${yamlFiles.length} entity YAML files`,
  });

  // 2. Verify generated files exist and are up-to-date
  const changeReport = detectChanges(root, DEFAULT_SCAN_DIRS);

  const staleCount = changeReport.stale.length;
  const orphanedCount = changeReport.orphaned.length;
  const generatedCheck = staleCount === 0 && orphanedCount === 0;

  result.checks.push({
    name: 'generated-freshness',
    passed: generatedCheck,
    detail: generatedCheck
      ? `All ${changeReport.total} generated files are up to date`
      : `${staleCount} stale, ${orphanedCount} orphaned out of ${changeReport.total}`,
  });

  if (!generatedCheck) result.passed = false;

  // 3. For each YAML, check that corresponding generated files exist
  for (const yamlFile of yamlFiles) {
    const yamlPath = resolve(entitiesDir, yamlFile);
    try {
      const content = readFileSync(yamlPath, 'utf-8');
      const entity = parseYaml(content) as Record<string, unknown>;
      const name = entity.name as string;
      if (!name) {
        result.passed = false;
        result.checks.push({
          name: `yaml-valid:${yamlFile}`,
          passed: false,
          detail: `${yamlFile} missing 'name' field`,
        });
        continue;
      }

      // Check entity file exists
      // Convert PascalCase to kebab-case, handling consecutive uppercase (e.g., LLMCall → llm-call)
      const kebab = name
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
      const entityFile = resolve(root, `packages/entities/src/${kebab}.entity.ts`);
      const typesFile = resolve(root, `packages/types/src/${kebab}.types.ts`);

      const entityExists = existsSync(entityFile);
      const typesExists = existsSync(typesFile);

      if (!entityExists || !typesExists) {
        result.passed = false;
        const missing = [];
        if (!entityExists) missing.push('entity');
        if (!typesExists) missing.push('types');
        result.checks.push({
          name: `generated-exists:${yamlFile}`,
          passed: false,
          detail: `Missing generated files for ${name}: ${missing.join(', ')}`,
        });
      } else {
        result.checks.push({
          name: `generated-exists:${yamlFile}`,
          passed: true,
          detail: `${name}: entity + types files exist`,
        });
      }
    } catch (e) {
      result.passed = false;
      result.checks.push({
        name: `yaml-parse:${yamlFile}`,
        passed: false,
        detail: `Failed to parse ${yamlFile}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // 4. Check generator ratio
  const ratio = computeRatio(root);
  const pct = ratio.total > 0 ? ratio.generated / ratio.total : 0;
  const ratioOk = pct >= RATIO_TARGET;

  result.checks.push({
    name: 'generator-ratio',
    passed: ratioOk,
    detail: `${(pct * 100).toFixed(1)}% generated (${ratio.generated}/${ratio.total}), target: ${RATIO_TARGET * 100}%`,
  });

  if (!ratioOk) result.passed = false;

  return result;
}

// Main
const result = run();

console.log('\n📋 Schema Enforcement Check\n');
for (const check of result.checks) {
  const icon = check.passed ? '✅' : '❌';
  console.log(`  ${icon} ${check.name}: ${check.detail}`);
}

console.log(result.passed
  ? '\n✅ All checks passed!\n'
  : '\n❌ Some checks failed. Run `flusk regenerate` to fix stale files.\n');

process.exit(result.passed ? 0 : 1);
