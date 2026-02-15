/**
 * Schema Validator Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSchemas } from './schema.validator.js';

const TEST_DIR = resolve(process.cwd(), 'test-temp-schemas');

describe('Schema Validator', () => {
  beforeEach(() => {
    // Create test directory
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(resolve(TEST_DIR, 'packages/entities/src'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should validate valid TypeBox schema', async () => {
    // Create valid schema file
    const schemaContent = `
import { Type, Static } from '@sinclair/typebox';

export const UserSchema = Type.Object({
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Integer({ minimum: 0 }),
});

export type User = Static<typeof UserSchema>;
    `.trim();

    writeFileSync(
      resolve(TEST_DIR, 'packages/entities/src/user.entity.ts'),
      schemaContent
    );

    const result = await validateSchemas(TEST_DIR);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should detect missing TypeBox import', async () => {
    // Create schema without TypeBox import
    const schemaContent = `
export const UserSchema = Type.Object({
  name: Type.String(),
});
    `.trim();

    writeFileSync(
      resolve(TEST_DIR, 'packages/entities/src/user.entity.ts'),
      schemaContent
    );

    const result = await validateSchemas(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes('Missing TypeBox import'));
  });

  it('should detect invalid TypeBox type', async () => {
    // Create schema with invalid type
    const schemaContent = `
import { Type } from '@sinclair/typebox';

export const UserSchema = Type.Object({
  name: Type.InvalidType(),
});
    `.trim();

    writeFileSync(
      resolve(TEST_DIR, 'packages/entities/src/user.entity.ts'),
      schemaContent
    );

    const result = await validateSchemas(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('Invalid TypeBox type')));
  });

  it('should detect unmatched braces', async () => {
    // Create schema with unmatched braces
    const schemaContent = `
import { Type } from '@sinclair/typebox';

export const UserSchema = Type.Object({
  name: Type.String(),
`;

    writeFileSync(
      resolve(TEST_DIR, 'packages/entities/src/user.entity.ts'),
      schemaContent
    );

    const result = await validateSchemas(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('Unmatched braces')));
  });

  it('should detect reserved keyword field names', async () => {
    // Create schema with reserved keyword
    const schemaContent = `
import { Type } from '@sinclair/typebox';

export const UserSchema = Type.Object({
  class: Type.String(),
});
    `.trim();

    writeFileSync(
      resolve(TEST_DIR, 'packages/entities/src/user.entity.ts'),
      schemaContent
    );

    const result = await validateSchemas(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('reserved keyword')));
  });

  it('should warn about missing TypeScript type export', async () => {
    // Create schema without type export
    const schemaContent = `
import { Type } from '@sinclair/typebox';

export const UserSchema = Type.Object({
  name: Type.String(),
});
    `.trim();

    writeFileSync(
      resolve(TEST_DIR, 'packages/entities/src/user.entity.ts'),
      schemaContent
    );

    const result = await validateSchemas(TEST_DIR);

    assert.ok(result.warnings.some(w => w.message.includes('Missing TypeScript type export')));
  });

  it('should handle empty entities directory', async () => {
    const result = await validateSchemas(TEST_DIR);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.warnings.length, 1);
    assert.ok(result.warnings[0].message.includes('No entity files found'));
  });

  it('should handle missing entities directory', async () => {
    // Remove entities directory
    rmSync(resolve(TEST_DIR, 'packages/entities'), { recursive: true, force: true });

    const result = await validateSchemas(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.ok(result.errors[0].message.includes('Entities directory not found'));
  });
});
