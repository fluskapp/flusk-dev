#!/usr/bin/env tsx
/**
 * Regenerate all generated files from entity definitions
 * Reads .fluskrc.json and calls `flusk g` for each entity
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

interface FluskConfig {
  entities: string[];
  generated: Record<string, boolean>;
  manual: Record<string, boolean>;
  generator: {
    maxLines: number;
    templatesDir: string;
  };
}

const CONFIG_PATH = join(process.cwd(), '.fluskrc.json');

function main() {
  console.log('🔄 Flusk Regeneration Script\n');

  // Load configuration
  if (!existsSync(CONFIG_PATH)) {
    console.error('❌ Error: .fluskrc.json not found');
    process.exit(1);
  }

  const config: FluskConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  console.log(`📋 Found ${config.entities.length} entities to regenerate:\n`);

  const results: Array<{ entity: string; status: 'success' | 'error'; message?: string }> = [];

  // Regenerate each entity
  for (const entity of config.entities) {
    const entityFile = `${entity}.entity.ts`;
    console.log(`🔨 Regenerating ${entity}...`);

    try {
      // Call flusk g command
      const output = execSync(`flusk g ${entityFile}`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });

      console.log(`  ✅ ${entity} regenerated successfully`);
      results.push({ entity, status: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ ${entity} failed: ${message}`);
      results.push({ entity, status: 'error', message });
    }

    console.log('');
  }

  // Print summary
  console.log('📊 Summary:');
  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'error').length;

  console.log(`  ✅ Successful: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Some regenerations failed. Please review errors above.');
    process.exit(1);
  }

  console.log('\n✨ All files regenerated successfully!');
}

main();
