/** @generated —
 * flusk infra:down - Stop Docker infrastructure services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  checkDocker,
  checkDockerComposeFile,
  stopServices,
} from '../../utils/docker.js';

export const downCommand = new Command('down')
  .description('Stop Docker infrastructure services')
  .action(async () => {
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

    // Stop services
    const spinner = ora('Stopping infrastructure services...').start();

    try {
      await stopServices(projectRoot);
      spinner.succeed('Infrastructure services stopped');
      console.log(chalk.green('\n✅ All services stopped successfully\n'));
    } catch (error) {
      spinner.fail('Failed to stop services');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
