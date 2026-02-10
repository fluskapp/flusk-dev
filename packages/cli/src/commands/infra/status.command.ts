/**
 * flusk infra:status - Check health status of Docker infrastructure services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  checkDocker,
  checkDockerComposeFile,
  getServicesStatus,
} from '../../utils/docker.js';

export const statusCommand = new Command('status')
  .description('Check health status of Docker infrastructure services')
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

    // Get service status
    const spinner = ora('Checking service status...').start();
    const services = await getServicesStatus(projectRoot);
    spinner.stop();

    if (services.length === 0) {
      console.log(chalk.yellow('\n⚠️  No services are running'));
      console.log(chalk.gray('\n💡 Run "flusk infra:up" to start services\n'));
      process.exit(0);
    }

    // Display status table
    console.log(chalk.blue('\n📊 Infrastructure Status:\n'));

    // Table header
    console.log(
      chalk.gray('Service'.padEnd(20)) +
      chalk.gray('State'.padEnd(15)) +
      chalk.gray('Health'.padEnd(15)) +
      chalk.gray('Ports')
    );
    console.log(chalk.gray('─'.repeat(70)));

    // Table rows
    for (const service of services) {
      const stateColor = service.state === 'running' ? chalk.green : chalk.red;
      const healthIcon = getHealthIcon(service.health);
      const healthText = `${healthIcon} ${service.health}`;

      console.log(
        chalk.cyan(service.name.padEnd(20)) +
        stateColor(service.state.padEnd(15)) +
        healthText.padEnd(15) +
        chalk.gray(service.ports.join(', '))
      );
    }

    console.log('');

    // Summary
    const runningCount = services.filter(s => s.state === 'running').length;
    const healthyCount = services.filter(s => s.health === 'healthy').length;
    const total = services.length;

    if (runningCount === total && healthyCount === total) {
      console.log(chalk.green('✅ All services are running and healthy\n'));
    } else if (runningCount === total) {
      console.log(chalk.yellow('⚠️  All services running but some are not healthy yet\n'));
    } else {
      console.log(chalk.red(`❌ ${total - runningCount} service(s) not running\n`));
    }

    // Management UIs
    if (runningCount > 0) {
      console.log(chalk.blue('📊 Management UIs:'));
      console.log(`  Adminer (PostgreSQL): ${chalk.cyan('http://localhost:8080')}`);
      console.log(`  RedisInsight (Redis):  ${chalk.cyan('http://localhost:8001')}\n`);
    }
  });

function getHealthIcon(health: string): string {
  switch (health) {
    case 'healthy':
      return '🟢';
    case 'unhealthy':
      return '🔴';
    case 'starting':
      return '🟡';
    default:
      return '⚪';
  }
}
