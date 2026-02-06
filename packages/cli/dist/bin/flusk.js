#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from '../src/commands/generate.js';
import { migrateCommand } from '../src/commands/migrate.js';
const program = new Command();
program
    .name('flusk')
    .description('Flusk CLI - Generate code from entity schemas')
    .version('0.1.0');
program.addCommand(generateCommand);
program.addCommand(migrateCommand);
program.parse(process.argv);
//# sourceMappingURL=flusk.js.map