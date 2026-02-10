/**
 * flusk infra:up - Start Docker infrastructure services
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  checkDocker,
  checkDockerComposeFile,
  startServices,
  getServicesStatus,
} from '../../utils/docker.js';

export const upCommand = new Command('up')
  .description('Start Docker infrastructure services')
  .action(async () => {
    const projectRoot = process.cwd();

    // Check Docker installation and status
    const spinner = ora('Checking Docker...').start();
    const dockerStatus = await checkDocker();

    if (!dockerStatus.installed) {
      spinner.fail('Docker is not installed');
      console.error(chalk.red('\n❌ Error: Docker is not installed'));
      console.error(chalk.yellow('💡 Fix: Install Docker from https://www.docker.com/get-started'));
      process.exit(1);
    }

    if (!dockerStatus.running) {
      spinner.fail('Docker is not running');
      console.error(chalk.red('\n❌ Error: Docker daemon is not running'));
      console.error(chalk.yellow('💡 Fix: Start Docker Desktop or run "sudo systemctl start docker"'));
      process.exit(1);
    }

    if (!dockerStatus.composeAvailable) {
      spinner.fail('Docker Compose is not available');
      console.error(chalk.red('\n❌ Error: Docker Compose is not available'));
      console.error(chalk.yellow('💡 Fix: Update Docker to the latest version'));
      process.exit(1);
    }

    spinner.succeed('Docker is ready');

    // Check docker-compose.yml exists
    if (!checkDockerComposeFile(projectRoot)) {
      console.error(chalk.red('\n❌ Error: docker-compose.yml not found'));
      console.error(chalk.yellow('💡 Fix: Run "flusk init" to create infrastructure files'));
      process.exit(1);
    }

    // Start services
    const startSpinner = ora('Starting infrastructure services...').start();

    try {
      await startServices(projectRoot);
      startSpinner.succeed('Infrastructure services started');

      // Wait a moment for services to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get service status
      const statusSpinner = ora('Checking service health...').start();
      const services = await getServicesStatus(projectRoot);
      statusSpinner.stop();

      console.log(chalk.green('\n✅ Infrastructure is ready!\n'));

      // Display service information
      console.log(chalk.blue('Services:'));
      for (const service of services) {
        const stateColor = service.state === 'running' ? chalk.green : chalk.red;
        const healthIndicator = getHealthIndicator(service.health);
        
        console.log(`  ${healthIndicator} ${chalk.cyan(service.name)} - ${stateColor(service.state)}`);
        
        if (service.ports.length > 0) {
          console.log(`     ${chalk.gray('Ports:')} ${service.ports.join(', ')}`);
        }
      }

      console.log(chalk.blue('\n📊 Management UIs:'));
      console.log(`  Adminer (PostgreSQL): ${chalk.cyan('http://localhost:8080')}`);
      console.log(`  RedisInsight (Redis):  ${chalk.cyan('http://localhost:8001')}`);

      console.log(chalk.gray('\nℹ️  Use "flusk infra:logs" to view logs'));
      console.log(chalk.gray('ℹ️  Use "flusk infra:down" to stop services\n'));
    } catch (error) {
      startSpinner.fail('Failed to start services');
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      console.error(chalk.yellow('\n💡 Try running: docker compose up -d'));
      process.exit(1);
    }
  });

function getHealthIndicator(health: string): string {
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
