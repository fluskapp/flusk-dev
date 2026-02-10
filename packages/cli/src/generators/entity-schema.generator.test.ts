/**
 * Unit tests for entity schema generator
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateEntitySchemaContent } from './entity-schema.generator.js';
import type { EntityDefinition } from '../interactive/entity.prompts.js';

describe('Entity Schema Generator', () => {
  describe('generateEntitySchemaContent', () => {
    test('generates schema with no additional fields', () => {
      const definition: EntityDefinition = {
        name: 'Product',
        fields: []
      };

      const content = generateEntitySchemaContent(definition);

      // Verify imports
      assert.ok(content.includes("import { Type, Static } from '@sinclair/typebox'"));
      assert.ok(content.includes("import { BaseEntitySchema } from './base.entity.js'"));

      // Verify schema definition with no fields (only BaseEntitySchema)
      assert.ok(content.includes('export const ProductEntitySchema = Type.Composite(['));
      assert.ok(content.includes('BaseEntitySchema'));

      // Should NOT have additional Type.Object when no fields
      assert.ok(!content.includes('Type.Object({'));

      // Verify type export
      assert.ok(content.includes('export type ProductEntity = Static<typeof ProductEntitySchema>'));
    });

    test('generates schema with String field (required)', () => {
      const definition: EntityDefinition = {
        name: 'User',
        fields: [
          { name: 'email', type: 'String', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify field definition
      assert.ok(content.includes('email: Type.String('));
      assert.ok(!content.includes('Type.Optional(')); // Required field not wrapped
    });

    test('generates schema with Email field', () => {
      const definition: EntityDefinition = {
        name: 'User',
        fields: [
          { name: 'email', type: 'Email', required: true, unique: true }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify Email format
      assert.ok(content.includes("email: Type.String({ format: 'email', description"));
    });

    test('generates schema with UUID field', () => {
      const definition: EntityDefinition = {
        name: 'Order',
        fields: [
          { name: 'userId', type: 'UUID', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify UUID format
      assert.ok(content.includes("userId: Type.String({ format: 'uuid', description"));
    });

    test('generates schema with Date field', () => {
      const definition: EntityDefinition = {
        name: 'Event',
        fields: [
          { name: 'scheduledAt', type: 'Date', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify Date format (date-time in TypeBox)
      assert.ok(content.includes("scheduledAt: Type.String({ format: 'date-time', description"));
    });

    test('generates schema with Integer field', () => {
      const definition: EntityDefinition = {
        name: 'Product',
        fields: [
          { name: 'quantity', type: 'Integer', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify Integer type
      assert.ok(content.includes('quantity: Type.Integer({ minimum: 0, description'));
    });

    test('generates schema with Number field', () => {
      const definition: EntityDefinition = {
        name: 'Product',
        fields: [
          { name: 'price', type: 'Number', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify Number type
      assert.ok(content.includes('price: Type.Number({ minimum: 0, description'));
    });

    test('generates schema with Boolean field', () => {
      const definition: EntityDefinition = {
        name: 'User',
        fields: [
          { name: 'isActive', type: 'Boolean', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify Boolean type
      assert.ok(content.includes('isActive: Type.Boolean({ description'));
    });

    test('wraps optional fields with Type.Optional', () => {
      const definition: EntityDefinition = {
        name: 'User',
        fields: [
          { name: 'nickname', type: 'String', required: false, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify Optional wrapper
      assert.ok(content.includes('nickname: Type.Optional(Type.String('));
    });

    test('generates schema with multiple fields', () => {
      const definition: EntityDefinition = {
        name: 'User',
        fields: [
          { name: 'email', type: 'Email', required: true, unique: true },
          { name: 'name', type: 'String', required: true, unique: false },
          { name: 'age', type: 'Integer', required: false, unique: false },
          { name: 'isActive', type: 'Boolean', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify all fields present
      assert.ok(content.includes('email:'));
      assert.ok(content.includes('name:'));
      assert.ok(content.includes('age:'));
      assert.ok(content.includes('isActive:'));

      // Verify optional field wrapped
      assert.ok(content.includes('age: Type.Optional('));

      // Verify required fields not wrapped
      assert.ok(!content.includes('email: Type.Optional('));
      assert.ok(!content.includes('name: Type.Optional('));
      assert.ok(!content.includes('isActive: Type.Optional('));
    });

    test('generates valid TypeScript code', () => {
      const definition: EntityDefinition = {
        name: 'LLMCall',
        fields: [
          { name: 'provider', type: 'String', required: true, unique: false },
          { name: 'model', type: 'String', required: true, unique: false },
          { name: 'tokens', type: 'Integer', required: true, unique: false },
          { name: 'cost', type: 'Number', required: true, unique: false }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify proper TypeScript structure
      assert.ok(content.includes('export const LLMCallEntitySchema'));
      assert.ok(content.includes('export type LLMCallEntity'));
      assert.ok(content.includes('Type.Composite(['));
      assert.ok(content.includes('Type.Object({'));

      // Should not have syntax errors (basic check)
      assert.ok(!content.includes('Type.Object({})'));
      assert.ok(!content.includes(',,'));
    });

    test('handles entity names with acronyms correctly', () => {
      const definition: EntityDefinition = {
        name: 'APIKey',
        fields: [
          { name: 'key', type: 'UUID', required: true, unique: true }
        ]
      };

      const content = generateEntitySchemaContent(definition);

      // Verify entity name preserved
      assert.ok(content.includes('export const APIKeyEntitySchema'));
      assert.ok(content.includes('export type APIKeyEntity'));
    });
  });
});
