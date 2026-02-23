/**
 * TypeBox field definition generator from field configuration
 */

import type { FieldDefinition } from '../types/entity.types.js';

/**
 * Generate TypeBox field definition from field configuration
 */
export function generateFieldDefinition(field: FieldDefinition): string {
  const description = field.description || `${field.name} field`;
  let typeDef = '';

  switch (field.type) {
    case 'String':
      typeDef = `Type.String({ description: '${description}' })`;
      break;
    case 'Integer':
      typeDef = `Type.Integer({ minimum: 0, description: '${description}' })`;
      break;
    case 'Number':
      typeDef = `Type.Number({ minimum: 0, description: '${description}' })`;
      break;
    case 'Boolean':
      typeDef = `Type.Boolean({ description: '${description}' })`;
      break;
    case 'UUID':
      typeDef = `Type.String({ format: 'uuid', description: '${description}' })`;
      break;
    case 'Date':
      typeDef = `Type.String({ format: 'date-time', description: '${description}' })`;
      break;
    case 'Email':
      typeDef = `Type.String({ format: 'email', description: '${description}' })`;
      break;
    default:
      typeDef = `Type.String({ description: '${description}' })`;
  }

  if (!field.required) {
    typeDef = `Type.Optional(${typeDef})`;
  }

  return typeDef;
}
