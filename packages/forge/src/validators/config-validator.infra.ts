/**
 * Docker and Watt config validators
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationResult } from './config-validator.types.js';
import { createEmptyResult } from './config-validator.types.js';

export { validateWattJson } from './watt-validator.infra.js';

/**
 * Validate docker-compose.yml
 */
export function validateDockerCompose(projectRoot: string): ValidationResult {
  const result = createEmptyResult();
  const dockerComposePath = resolve(projectRoot, 'docker-compose.yml');

  if (!existsSync(dockerComposePath)) {
    result.warnings.push({
      file: 'docker-compose.yml',
      message: 'docker-compose.yml not found',
    });
    return result;
  }

  try {
    const content = readFileSync(dockerComposePath, 'utf-8');

    const requiredServices = ['postgres', 'redis'];
    for (const service of requiredServices) {
      if (!content.includes(service)) {
        result.valid = false;
        result.errors.push({
          file: 'docker-compose.yml',
          message: `Missing required service: ${service}`,
          fix: `Add ${service} service to docker-compose.yml`,
        });
      }
    }

    if (!content.includes('version:')) {
      result.warnings.push({
        file: 'docker-compose.yml',
        message: 'Missing version field (optional in Compose V2)',
      });
    }

    if (!content.includes('networks:')) {
      result.warnings.push({
        file: 'docker-compose.yml',
        message: 'No networks defined',
      });
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      file: 'docker-compose.yml',
      message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return result;
}
