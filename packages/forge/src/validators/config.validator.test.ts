/**
 * Config Validator Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateConfig } from './config.validator.js';

const TEST_DIR = resolve(process.cwd(), 'test-temp-config');

describe('Config Validator', () => {
  beforeEach(() => {
    // Create test directory
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should validate valid package.json', async () => {
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'tsx watch',
        build: 'tsc',
        test: 'vitest',
        start: 'node dist/index.js',
      },
    };

    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, true);
  });

  it('should detect missing package.json', async () => {
    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.file === 'package.json'));
  });

  it('should detect invalid JSON in package.json', async () => {
    writeFileSync(resolve(TEST_DIR, 'package.json'), '{ invalid json }');

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('Invalid JSON')));
  });

  it('should detect missing "type": "module"', async () => {
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
    };

    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('type')));
  });

  it('should warn about missing recommended scripts', async () => {
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      scripts: {},
    };

    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

    const result = await validateConfig(TEST_DIR);

    assert.ok(result.warnings.some(w => w.message.includes('Missing recommended script')));
  });

  it('should validate .env.example with required variables', async () => {
    const envExample = `
DATABASE_URL=postgresql://user:password@localhost:5432/db
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
    `.trim();

    writeFileSync(resolve(TEST_DIR, '.env.example'), envExample);
    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test', type: 'module' }));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, true);
  });

  it('should detect missing required env variables', async () => {
    const envExample = `
DATABASE_URL=postgresql://user:password@localhost:5432/db
    `.trim();

    writeFileSync(resolve(TEST_DIR, '.env.example'), envExample);
    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test', type: 'module' }));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('REDIS_URL')));
    assert.ok(result.errors.some(e => e.message.includes('NODE_ENV')));
  });

  it('should validate docker-compose.yml with required services', async () => {
    const dockerCompose = `
version: '3.8'
services:
  postgres:
    image: postgres:16
  redis:
    image: redis:7
    `.trim();

    writeFileSync(resolve(TEST_DIR, 'docker-compose.yml'), dockerCompose);
    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test', type: 'module' }));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, true);
  });

  it('should detect missing required services in docker-compose.yml', async () => {
    const dockerCompose = `
version: '3.8'
services:
  postgres:
    image: postgres:16
    `.trim();

    writeFileSync(resolve(TEST_DIR, 'docker-compose.yml'), dockerCompose);
    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test', type: 'module' }));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('redis')));
  });

  it('should validate watt.json with required fields', async () => {
    const wattConfig = {
      $schema: 'https://platformatic.dev/schemas/v1.0.0/watt',
      entrypoint: 'main-service',
      services: [
        {
          id: 'main-service',
          path: './packages/execution',
        },
      ],
    };

    writeFileSync(resolve(TEST_DIR, 'watt.json'), JSON.stringify(wattConfig, null, 2));
    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test', type: 'module' }));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, true);
  });

  it('should detect missing entrypoint in watt.json', async () => {
    const wattConfig = {
      $schema: 'https://platformatic.dev/schemas/v1.0.0/watt',
      services: [],
    };

    writeFileSync(resolve(TEST_DIR, 'watt.json'), JSON.stringify(wattConfig, null, 2));
    writeFileSync(resolve(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test', type: 'module' }));

    const result = await validateConfig(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('entrypoint')));
  });
});
