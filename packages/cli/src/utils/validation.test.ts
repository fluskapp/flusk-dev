import { describe, it, expect } from 'vitest';
import {
  validatePort, validatePositiveInt, validateRange,
  validateEnum, validateNonEmpty, ValidationError,
} from './validation.js';

describe('validatePort', () => {
  it('accepts valid ports', () => {
    expect(validatePort('8080')).toBe(8080);
    expect(validatePort('1')).toBe(1);
    expect(validatePort('65535')).toBe(65535);
  });

  it('rejects invalid ports', () => {
    expect(() => validatePort('0')).toThrow(ValidationError);
    expect(() => validatePort('65536')).toThrow(ValidationError);
    expect(() => validatePort('abc')).toThrow(ValidationError);
  });
});

describe('validatePositiveInt', () => {
  it('accepts positive integers', () => {
    expect(validatePositiveInt('5', 'count')).toBe(5);
  });

  it('rejects non-positive', () => {
    expect(() => validatePositiveInt('0', 'count')).toThrow(ValidationError);
    expect(() => validatePositiveInt('-1', 'count')).toThrow(ValidationError);
  });
});

describe('validateRange', () => {
  it('accepts within range', () => {
    expect(validateRange('5', 1, 10, 'val')).toBe(5);
  });

  it('rejects out of range', () => {
    expect(() => validateRange('11', 1, 10, 'val')).toThrow(ValidationError);
  });
});

describe('validateEnum', () => {
  it('accepts valid values', () => {
    expect(validateEnum('json', ['json', 'text'], 'format')).toBe('json');
  });

  it('rejects invalid values', () => {
    expect(() => validateEnum('xml', ['json', 'text'], 'format')).toThrow(ValidationError);
  });
});

describe('validateNonEmpty', () => {
  it('accepts non-empty strings', () => {
    expect(validateNonEmpty('hello', 'name')).toBe('hello');
  });

  it('rejects empty strings', () => {
    expect(() => validateNonEmpty('', 'name')).toThrow(ValidationError);
    expect(() => validateNonEmpty('  ', 'name')).toThrow(ValidationError);
  });
});
