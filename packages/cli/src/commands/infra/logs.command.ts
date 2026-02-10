/**
 * flusk infra:logs - View logs from Docker infrastructure services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  checkDocker,
  checkDockerComposeFile,
  getLogs,
} from '../../utils/docker.js';

export const logsCommand = new Command('logs')
  .description('View logs from Docker infrastructure services')
  .argument('[service]', 'Service name (postgres, redis, adminer, redisinsight) or empty for all')
  .action(async (service?: string) => {
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

    // Show logs
    try {
      const serviceText = service ? chalk.cyan(service) : chalk.cyan('all services');
      console.log(chalk.blue(`\n📋 Showing logs for ${serviceText}...\n`));
      console.log(chalk.gray('Press Ctrl+C to stop following logs\n'));

      await getLogs(service, projectRoot);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
