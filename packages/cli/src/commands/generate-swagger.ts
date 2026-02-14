import { Command } from 'commander';
import chalk from 'chalk';
import { generateSwagger } from '../generators/swagger.generator.js';

export const generateSwaggerCommand = new Command('g:swagger')
  .description('Generate Swagger/OpenAPI plugin')
  .option('--title <title>', 'API title', 'Flusk API')
  .option('--version <version>', 'API version', '0.1.0')
  .option('--description <desc>', 'API description')
  .option('--prefix <prefix>', 'Route prefix', '/docs')
  .action(async (options) => {
    console.log(chalk.blue('\n📖 Generating Swagger plugin...\n'));
    try {
      const result = await generateSwagger({
        title: options.title,
        version: options.version,
        description: options.description,
        routePrefix: options.prefix,
      });
      console.log(chalk.green(`✅ ${result.path}`));
      console.log(chalk.green('\n✨ Swagger plugin generated!\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });
