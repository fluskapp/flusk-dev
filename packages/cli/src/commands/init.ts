import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import chalk from 'chalk';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { generateInfrastructure, generateInitDbScript } from '../generators/infrastructure.generator.js';

const execAsync = promisify(exec);

export const initCommand = new Command('init')
  .description('Initialize a new Flusk project')
  .argument('[project-name]', 'Name of the project to create')
  .option('--skip-install', 'Skip running pnpm install')
  .option('--skip-git', 'Skip initializing git repository')
  .option('--no-docker', 'Skip generating docker-compose.yml')
  .action(async (projectName: string | undefined, options) => {
    // Validate project name
    if (!projectName) {
      console.error(chalk.red('Error: Project name is required'));
      console.error(chalk.yellow('Example: flusk init my-api-project'));
      process.exit(1);
    }

    // Validate project name format
    const validNameRegex = /^[a-z0-9-_]+$/i;
    if (!validNameRegex.test(projectName)) {
      console.error(chalk.red('Error: Invalid project name'));
      console.error(chalk.yellow('Project name must contain only letters, numbers, hyphens, and underscores'));
      console.error(chalk.yellow('Example: flusk init my-api-project'));
      process.exit(1);
    }

    const targetDir = resolve(process.cwd(), projectName);

    // Check if directory already exists
    if (existsSync(targetDir)) {
      console.error(chalk.red(`Error: Directory '${projectName}' already exists`));
      console.error(chalk.yellow('Please choose a different project name or remove the existing directory'));
      process.exit(1);
    }

    console.log(chalk.blue('\n🚀 Initializing Flusk project...\n'));

    try {
      // Create project directory
      await mkdir(targetDir, { recursive: true });
      console.log(chalk.green(`✅ Created project directory: ${projectName}`));

      // Generate infrastructure files
      const results = await generateInfrastructure({
        projectName,
        targetDir,
        skipDockerCompose: options.docker === false
      });

      for (const result of results) {
        console.log(chalk.green(`✅ Generated ${result.path}`));
      }

      // Generate database initialization script
      const initDbResult = await generateInitDbScript(targetDir);
      console.log(chalk.green(`✅ Generated ${initDbResult.path}`));

      // Create package.json
      const packageJson = {
        name: projectName,
        version: '0.1.0',
        type: 'module',
        private: true,
        scripts: {
          dev: 'platformatic watt',
          build: 'pnpm -r build',
          start: 'NODE_ENV=production platformatic watt',
          'db:migrate': 'flusk migrate',
          'infra:up': 'docker compose up -d',
          'infra:down': 'docker compose down',
          'infra:logs': 'docker compose logs -f'
        },
        workspaces: [
          'packages/*'
        ],
        devDependencies: {
          '@types/node': '^22.10.5',
          'typescript': '^5.7.0',
          '@flusk/cli': 'workspace:*'
        },
        dependencies: {
          '@platformatic/watt': '^3.37.0',
          'fastify': '^5.0.0',
          '@fastify/cors': '^10.0.0',
          'pg': '^8.13.1'
        }
      };

      const { writeFile } = await import('node:fs/promises');
      await writeFile(
        resolve(targetDir, 'package.json'),
        JSON.stringify(packageJson, null, 2),
        'utf-8'
      );
      console.log(chalk.green('✅ Generated package.json'));

      // Initialize git repository
      if (!options.skipGit) {
        try {
          await execAsync('git --version');
          await execAsync('git init', { cwd: targetDir });
          console.log(chalk.green('✅ Initialized git repository'));
        } catch (error) {
          console.log(chalk.yellow('⚠️  Git not found, skipping git initialization'));
        }
      } else {
        console.log(chalk.gray('⏭️  Skipped git initialization'));
      }

      // Run pnpm install
      if (!options.skipInstall) {
        try {
          await execAsync('pnpm --version');
          console.log(chalk.cyan('\n📦 Installing dependencies (this may take a minute)...'));
          await execAsync('pnpm install', { cwd: targetDir });
          console.log(chalk.green('✅ Installed dependencies'));
        } catch (error) {
          if ((error as any).code === 'ENOENT') {
            console.log(chalk.yellow('⚠️  pnpm not found, skipping dependency installation'));
            console.log(chalk.yellow('   Install pnpm globally: npm install -g pnpm'));
          } else {
            console.log(chalk.yellow('⚠️  Failed to install dependencies'));
            console.log(chalk.gray(`   ${(error as Error).message}`));
          }
        }
      } else {
        console.log(chalk.gray('⏭️  Skipped dependency installation'));
      }

      // Display success message
      console.log(chalk.green('\n✨ Project initialized successfully!\n'));
      console.log(chalk.cyan('📋 Next steps:\n'));
      console.log(chalk.white(`  1. ${chalk.bold(`cd ${projectName}`)}`));
      console.log(chalk.white(`  2. ${chalk.bold('cp .env.example .env')} ${chalk.gray('(and update with your values)')}`));
      console.log(chalk.white(`  3. ${chalk.bold('pnpm infra:up')} ${chalk.gray('(start PostgreSQL and Redis)')}`));
      console.log(chalk.white(`  4. ${chalk.bold('pnpm dev')} ${chalk.gray('(start development server)')}`));
      console.log(chalk.white('\n💡 Useful commands:\n'));
      console.log(chalk.gray('  pnpm db:migrate        Run database migrations'));
      console.log(chalk.gray('  pnpm infra:logs        View infrastructure logs'));
      console.log(chalk.gray('  flusk g <entity>       Generate code from entity'));
      console.log();

    } catch (error) {
      console.error(chalk.red('\n❌ Failed to initialize project:'));
      console.error(chalk.red(`   ${(error as Error).message}`));

      // Cleanup on error
      try {
        const { rm } = await import('node:fs/promises');
        if (existsSync(targetDir)) {
          await rm(targetDir, { recursive: true, force: true });
          console.log(chalk.yellow('🧹 Cleaned up partial project directory'));
        }
      } catch (cleanupError) {
        console.error(chalk.yellow('⚠️  Failed to cleanup directory'));
      }

      process.exit(1);
    }
  });
