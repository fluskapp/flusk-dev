/**
 * CLI input validation helpers — bounds checking for all commands.
 */

import { existsSync } from 'node:fs';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Validate a port number is in valid range. */
export function validatePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ValidationError(`Invalid port: ${value} (must be 1-65535)`);
  }
  return port;
}

/** Validate a file path exists. */
export function validateFilePath(path: string): string {
  if (!existsSync(path)) {
    throw new ValidationError(`File not found: ${path}`);
  }
  return path;
}

/** Validate a positive integer. */
export function validatePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1) {
    throw new ValidationError(`${name} must be a positive integer, got: ${value}`);
  }
  return n;
}

/** Validate a number within bounds. */
export function validateRange(
  value: string,
  min: number,
  max: number,
  name: string,
): number {
  const n = parseFloat(value);
  if (isNaN(n) || n < min || n > max) {
    throw new ValidationError(`${name} must be ${min}-${max}, got: ${value}`);
  }
  return n;
}

/** Validate a string is one of allowed values. */
export function validateEnum(
  value: string,
  allowed: readonly string[],
  name: string,
): string {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${name} must be one of: ${allowed.join(', ')}, got: ${value}`);
  }
  return value;
}

/** Validate a non-empty string. */
export function validateNonEmpty(value: string, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${name} must not be empty`);
  }
  return value.trim();
}
