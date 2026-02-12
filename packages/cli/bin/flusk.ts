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

program.parse(process.argv);
