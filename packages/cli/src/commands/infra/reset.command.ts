/** @generated —
 * flusk infra:reset - Reset Docker infrastructure (stop, remove volumes, restart)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  checkDocker,
  checkDockerComposeFile,
  resetServices,
  startServices,
} from '../../utils/docker.js';

export const resetCommand = new Command('reset')
  .description('Reset Docker infrastructure (WARNING: destroys all data)')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    const projectRoot = process.cwd();

    // Check Docker is running
    const dockerStatus = await checkDocker();
    if (!dockerStatus.running) {
      console.error(chalk.red('❌ Error: Docker is not running'));
      process.exit(1);
    }

    // Check docker-compose.yml exists
    if (!checkDockerComposeFile(projectRoot)) {
      console.error(chalk.red('❌ Error: docker-compose.yml not found'));
      process.exit(1);
    }

    // Confirm destructive action
    if (!options.yes) {
      console.log(chalk.yellow('\n⚠️  WARNING: This will destroy all data in PostgreSQL and Redis!'));
      console.log(chalk.gray('This action cannot be undone.\n'));

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset the infrastructure?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.gray('\nReset cancelled'));
        process.exit(0);
      }
    }

    // Reset services
    const spinner = ora('Resetting infrastructure...').start();

    try {
      await resetServices(projectRoot);
      spinner.text = 'Starting fresh services...';
      await startServices(projectRoot);
      
      spinner.succeed('Infrastructure reset complete');
      console.log(chalk.green('\n✅ Infrastructure has been reset with fresh data\n'));
      console.log(chalk.gray('ℹ️  Use "flusk infra:status" to check service health\n'));
    } catch (error) {
      spinner.fail('Failed to reset infrastructure');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
