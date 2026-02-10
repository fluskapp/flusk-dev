/**
 * Docker utility functions for infrastructure management
 */

import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface DockerCheckResult {
  installed: boolean;
  running: boolean;
  composeAvailable: boolean;
  version?: string;
}

export interface ServiceStatus {
  name: string;
  state: 'running' | 'exited' | 'restarting' | 'dead' | 'unknown';
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  ports: string[];
}

/**
 * Check if Docker is installed and running
 */
export async function checkDocker(): Promise<DockerCheckResult> {
  const result: DockerCheckResult = {
    installed: false,
    running: false,
    composeAvailable: false,
  };

  try {
    // Check if Docker is installed
    const { stdout } = await execa('docker', ['--version']);
    result.installed = true;
    result.version = stdout.trim();

    // Check if Docker daemon is running
    await execa('docker', ['info']);
    result.running = true;

    // Check if Docker Compose is available
    await execa('docker', ['compose', 'version']);
    result.composeAvailable = true;
  } catch (error) {
    // Docker not installed or not running
  }

  return result;
}

/**
 * Check if docker-compose.yml exists in project root
 */
export function checkDockerComposeFile(projectRoot: string = process.cwd()): boolean {
  const composePath = resolve(projectRoot, 'docker-compose.yml');
  return existsSync(composePath);
}

/**
 * Start Docker Compose services
 */
export async function startServices(projectRoot: string = process.cwd()): Promise<void> {
  await execa('docker', ['compose', 'up', '-d'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

/**
 * Stop Docker Compose services
 */
export async function stopServices(projectRoot: string = process.cwd()): Promise<void> {
  await execa('docker', ['compose', 'down'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

/**
 * Reset Docker Compose services (stop, remove volumes, restart)
 */
export async function resetServices(projectRoot: string = process.cwd()): Promise<void> {
  await execa('docker', ['compose', 'down', '-v'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

/**
 * Get logs from Docker Compose services
 */
export async function getLogs(
  service?: string,
  projectRoot: string = process.cwd()
): Promise<void> {
  const args = ['compose', 'logs', '-f'];
  if (service) {
    args.push(service);
  }

  await execa('docker', args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

/**
 * Get status of all Docker Compose services
 */
export async function getServicesStatus(
  projectRoot: string = process.cwd()
): Promise<ServiceStatus[]> {
  try {
    const { stdout } = await execa('docker', ['compose', 'ps', '--format', 'json'], {
      cwd: projectRoot,
    });

    if (!stdout.trim()) {
      return [];
    }

    // Parse JSON output (each line is a separate JSON object)
    const lines = stdout.trim().split('\n');
    const services: ServiceStatus[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        services.push({
          name: data.Service || data.Name || 'unknown',
          state: mapState(data.State),
          health: mapHealth(data.Health),
          ports: parsePorts(data.Publishers || []),
        });
      } catch (error) {
        // Skip invalid JSON lines
      }
    }

    return services;
  } catch (error) {
    return [];
  }
}

/**
 * Map Docker state to our state enum
 */
function mapState(state: string): ServiceStatus['state'] {
  const lowerState = (state || '').toLowerCase();
  if (lowerState.includes('running')) return 'running';
  if (lowerState.includes('exited')) return 'exited';
  if (lowerState.includes('restarting')) return 'restarting';
  if (lowerState.includes('dead')) return 'dead';
  return 'unknown';
}

/**
 * Map Docker health to our health enum
 */
function mapHealth(health: string): ServiceStatus['health'] {
  const lowerHealth = (health || '').toLowerCase();
  if (lowerHealth.includes('healthy')) return 'healthy';
  if (lowerHealth.includes('unhealthy')) return 'unhealthy';
  if (lowerHealth.includes('starting')) return 'starting';
  return 'none';
}

/**
 * Parse Docker port mappings
 */
function parsePorts(publishers: any[]): string[] {
  if (!Array.isArray(publishers)) return [];
  
  return publishers.map(p => {
    if (p.PublishedPort && p.TargetPort) {
      return `${p.PublishedPort}:${p.TargetPort}`;
    }
    return '';
  }).filter(Boolean);
}
