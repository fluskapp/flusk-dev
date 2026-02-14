#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from '../src/commands/generate.js';
import { migrateCommand } from '../src/commands/migrate.js';
import { createEntityCommand } from '../src/commands/create-entity.js';
import { initCommand } from '../src/commands/init.js';
import { infraCommand } from '../src/commands/infra/index.js';
import { generateServiceCommand } from '../src/commands/generate-service.js';
import { generateMiddlewareCommand } from '../src/commands/generate-middleware.js';
import { generatePluginCommand } from '../src/commands/generate-plugin.js';
import { generateTestCommand } from '../src/commands/generate-test.js';
import { validateSchemaCommand } from '../src/commands/validate-schema.js';
import { validateStructureCommand } from '../src/commands/validate-structure.js';
import { validateConfigCommand } from '../src/commands/validate-config.js';
import { generateFeatureCommand } from '../src/commands/generate-feature.js';
import { generatePackageCommand } from '../src/commands/generate-package.js';
import { validateCommand } from '../src/commands/validate.js';
import { generateMigrationCommand } from '../src/commands/generate-migration.js';
import { generateRouteCommand } from '../src/commands/generate-route.js';
import { setupCommand } from '../src/commands/setup.js';
import { generateDockerfileCommand } from '../src/commands/generate-dockerfile.js';
import { generateDockerComposeCommand } from '../src/commands/generate-docker-compose.js';
import { generateEnvCommand } from '../src/commands/generate-env.js';
import { generateWattCommand } from '../src/commands/generate-watt.js';
import { generateSwaggerCommand } from '../src/commands/generate-swagger.js';
import { generateEntrypointCommand } from '../src/commands/generate-entrypoint.js';
import { dashboardCommand } from '../src/commands/dashboard.js';
import { generateProviderCommand } from '../src/commands/generate-provider.js';
import { generateTuiComponentCommand } from '../src/commands/generate-tui-component.js';
import { generateTuiHookCommand } from '../src/commands/generate-tui-hook.js';
import { generateTuiScreenCommand } from '../src/commands/generate-tui-screen.js';
import { generateTuiAppCommand } from '../src/commands/generate-tui-app.js';
import { profileCommand } from '../src/commands/profile.js';
import { generateProfileCommand } from '../src/commands/generate-profile.js';
import { generateFastifyPluginCommand } from '../src/commands/generate-fastify-plugin.js';
import { generateOtelHookCommand } from '../src/commands/generate-otel-hook.js';
import { generateDetectorCommand } from '../src/commands/generate-detector.js';
import { generateSqliteRepoCommand } from '../src/commands/generate-sqlite-repo.js';
import { analyzeCommand } from '../src/commands/analyze.js';
import { reportCommand } from '../src/commands/report.js';
import { historyCommand } from '../src/commands/history.js';
import { budgetCommand } from '../src/commands/budget.js';
import { initConfigCommand } from '../src/commands/init-config.js';
import { generateEntityFromYamlCommand } from '../src/commands/generate-entity-from-yaml.js';
import { recipeCommand } from '../src/commands/recipe.js';
import { regenerateCommand } from '../src/commands/regenerate.js';
import { statusCommand } from '../src/commands/status.js';
import { validateGeneratedCommand } from '../src/commands/validate-generated.js';
import { ratioCommand } from '../src/commands/ratio.js';
import { guardCommand } from '../src/commands/guard.js';

const program = new Command();

program
  .name('flusk')
  .description('Flusk CLI - Code generation and project scaffolding')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(generateCommand);
program.addCommand(migrateCommand);
program.addCommand(createEntityCommand);
program.addCommand(infraCommand);
program.addCommand(generateServiceCommand);
program.addCommand(generateMiddlewareCommand);
program.addCommand(generatePluginCommand);
program.addCommand(generateTestCommand);
program.addCommand(validateSchemaCommand);
program.addCommand(validateStructureCommand);
program.addCommand(validateConfigCommand);

// Feature scaffolding: flusk feature <name>
program.addCommand(generateFeatureCommand);

// New commands
program.addCommand(generatePackageCommand);
program.addCommand(validateCommand);
program.addCommand(generateMigrationCommand);
program.addCommand(generateRouteCommand);
program.addCommand(setupCommand);

// Infrastructure generators
program.addCommand(generateDockerfileCommand);
program.addCommand(generateDockerComposeCommand);
program.addCommand(generateEnvCommand);
program.addCommand(generateWattCommand);
program.addCommand(generateSwaggerCommand);
program.addCommand(generateEntrypointCommand);

// Dashboard
program.addCommand(dashboardCommand);

// Provider generator
program.addCommand(generateProviderCommand);

// TUI generators
program.addCommand(generateTuiComponentCommand);
program.addCommand(generateTuiHookCommand);
program.addCommand(generateTuiScreenCommand);
program.addCommand(generateTuiAppCommand);

// Performance profiling
program.addCommand(profileCommand);
program.addCommand(generateProfileCommand);

// Fastify plugin, OTel hook, detector generators
program.addCommand(generateFastifyPluginCommand);
program.addCommand(generateOtelHookCommand);
program.addCommand(generateDetectorCommand);

// SQLite repository generator
program.addCommand(generateSqliteRepoCommand);

// LLM cost analysis
program.addCommand(analyzeCommand);
program.addCommand(reportCommand);
program.addCommand(historyCommand);
program.addCommand(budgetCommand);
program.addCommand(initConfigCommand);

// Schema-first entity generation
program.addCommand(generateEntityFromYamlCommand);

// Recipe system
program.addCommand(recipeCommand);

// Regeneration system
program.addCommand(regenerateCommand);
program.addCommand(statusCommand);

// Phase 5: CI enforcement
program.addCommand(validateGeneratedCommand);
program.addCommand(ratioCommand);
program.addCommand(guardCommand);

program.parse(process.argv);
