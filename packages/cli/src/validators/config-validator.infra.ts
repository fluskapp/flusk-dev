/** @generated —
 * Docker and Watt config validators
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationResult } from './config-validator.types.js';
import { createEmptyResult } from './config-validator.types.js';

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

/**
 * Validate watt.json
 */
export function validateWattJson(projectRoot: string): ValidationResult {
  const result = createEmptyResult();
  const wattJsonPath = resolve(projectRoot, 'watt.json');

  if (!existsSync(wattJsonPath)) {
    result.warnings.push({
      file: 'watt.json',
      message: 'watt.json not found',
    });
    return result;
  }

  try {
    const content = readFileSync(wattJsonPath, 'utf-8');
    const wattConfig = JSON.parse(content);

    if (!wattConfig.$schema) {
      result.warnings.push({
        file: 'watt.json',
        message: 'Missing $schema field',
      });
    }

    if (!wattConfig.entrypoint) {
      result.valid = false;
      result.errors.push({
        file: 'watt.json',
        message: 'Missing entrypoint field',
        fix: 'Add "entrypoint": "service-name"',
      });
    }

    if (!Array.isArray(wattConfig.services)) {
      result.valid = false;
      result.errors.push({
        file: 'watt.json',
        message: 'Missing or invalid services array',
        fix: 'Add "services": [{...}]',
      });
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      file: 'watt.json',
      message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      fix: 'Fix JSON syntax errors',
    });
  }

  return result;
}
