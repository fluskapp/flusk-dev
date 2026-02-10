/**
 * Config validator - validates configuration files
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  message: string;
  fix?: string;
}

export interface ValidationWarning {
  file: string;
  message: string;
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'NODE_ENV',
  'PORT',
  'LOG_LEVEL',
];

/**
 * Validate all configuration files
 */
export async function validateConfig(projectRoot: string = process.cwd()): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Validate package.json
  const packageJsonResult = validatePackageJson(projectRoot);
  result.errors.push(...packageJsonResult.errors);
  result.warnings.push(...packageJsonResult.warnings);
  if (!packageJsonResult.valid) {
    result.valid = false;
  }

  // Validate .env.example
  const envResult = validateEnvExample(projectRoot);
  result.errors.push(...envResult.errors);
  result.warnings.push(...envResult.warnings);
  if (!envResult.valid) {
    result.valid = false;
  }

  // Validate docker-compose.yml
  const dockerResult = validateDockerCompose(projectRoot);
  result.errors.push(...dockerResult.errors);
  result.warnings.push(...dockerResult.warnings);
  if (!dockerResult.valid) {
    result.valid = false;
  }

  // Validate watt.json
  const wattResult = validateWattJson(projectRoot);
  result.errors.push(...wattResult.errors);
  result.warnings.push(...wattResult.warnings);
  if (!wattResult.valid) {
    result.valid = false;
  }

  return result;
}

/**
 * Validate package.json
 */
function validatePackageJson(projectRoot: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const packageJsonPath = resolve(projectRoot, 'package.json');

  if (!existsSync(packageJsonPath)) {
    result.valid = false;
    result.errors.push({
      file: 'package.json',
      message: 'package.json not found',
      fix: 'Run: npm init or flusk init',
    });
    return result;
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    // Check required fields
    if (!pkg.name) {
      result.valid = false;
      result.errors.push({
        file: 'package.json',
        message: 'Missing "name" field',
        fix: 'Add "name": "your-project-name"',
      });
    }

    if (!pkg.version) {
      result.warnings.push({
        file: 'package.json',
        message: 'Missing "version" field',
      });
    }

    if (!pkg.type || pkg.type !== 'module') {
      result.valid = false;
      result.errors.push({
        file: 'package.json',
        message: 'Missing or incorrect "type" field',
        fix: 'Add "type": "module" for ESM support',
      });
    }

    // Check for pnpm workspace
    if (!pkg.workspaces && !existsSync(resolve(projectRoot, 'pnpm-workspace.yaml'))) {
      result.warnings.push({
        file: 'package.json',
        message: 'No workspace configuration found',
      });
    }

    // Check scripts
    const recommendedScripts = ['dev', 'build', 'test', 'start'];
    for (const script of recommendedScripts) {
      if (!pkg.scripts?.[script]) {
        result.warnings.push({
          file: 'package.json',
          message: `Missing recommended script: "${script}"`,
        });
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      file: 'package.json',
      message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      fix: 'Fix JSON syntax errors',
    });
  }

  return result;
}

/**
 * Validate .env.example
 */
function validateEnvExample(projectRoot: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const envExamplePath = resolve(projectRoot, '.env.example');

  if (!existsSync(envExamplePath)) {
    result.warnings.push({
      file: '.env.example',
      message: '.env.example not found',
    });
    return result;
  }

  try {
    const content = readFileSync(envExamplePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    const definedVars = lines.map(line => {
      const match = line.match(/^([^=]+)=/);
      return match ? match[1].trim() : null;
    }).filter(Boolean);

    // Check for required environment variables
    for (const envVar of REQUIRED_ENV_VARS) {
      if (!definedVars.includes(envVar)) {
        result.valid = false;
        result.errors.push({
          file: '.env.example',
          message: `Missing required environment variable: ${envVar}`,
          fix: `Add ${envVar}=<value> to .env.example`,
        });
      }
    }

    // Check for actual values (should be placeholders)
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (value && !value.startsWith('<') && !value.startsWith('your-') && key !== 'NODE_ENV') {
          result.warnings.push({
            file: '.env.example',
            message: `Possible actual value in .env.example: ${key}`,
          });
        }
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      file: '.env.example',
      message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return result;
}

/**
 * Validate docker-compose.yml
 */
function validateDockerCompose(projectRoot: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

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

    // Check for required services
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

    // Check for version (optional in Compose V2)
    if (!content.includes('version:')) {
      result.warnings.push({
        file: 'docker-compose.yml',
        message: 'Missing version field (optional in Compose V2)',
      });
    }

    // Check for networks
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
function validateWattJson(projectRoot: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

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

    // Check required fields
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

    // Check for services array
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
