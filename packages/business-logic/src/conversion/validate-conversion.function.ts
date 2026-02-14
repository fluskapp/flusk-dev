/**
 * Business logic stub - implement your domain logic here
 */

import { ConversionEntity } from '@flusk/types';

/**
 * Example validation function for Conversion
 * Pure function - no side effects, no I/O
 */
export function validateConversion(
  _entity: Partial<ConversionEntity>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // TODO: Add validation logic
  // Example:
  // if (!_entity.someField) {
  //   errors.push('someField is required');
  // }

  return {
    valid: errors.length === 0,
    errors
  };
}
