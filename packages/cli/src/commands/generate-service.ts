import { Command } from 'commander';
import chalk from 'chalk';
import { generateService } from '../generators/service.generator.js';

export const generateServiceCommand = new Command('g:service')
  .description('Generate a service class with dependency injection')
  .argument('<name>', 'Service name (e.g., user-auth)')
  .action(async (name: string) => {
    console.log(chalk.blue(`\n🔧 Generating service: ${name}...\n`));

    try {
      const results = await generateService(name);

      for (const result of results) {
        console.log(chalk.green(`✅ ${result.path}`));
      }

      console.log(chalk.green('\n✨ Service generated successfully!\n'));
      console.log(chalk.cyan('📋 Usage example:\n'));
      console.log(chalk.white('  import { create' + name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Service } from \'./services/' + name + '.service.js\';'));
      console.log(chalk.white('  const service = create' + name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Service();'));
      console.log(chalk.white('  await service.execute(data);\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to generate service:'));
      console.error(chalk.red(`   ${(error as Error).message}\n`));
      process.exit(1);
    }
  });
