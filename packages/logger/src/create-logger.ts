/** @generated —
 * Logger factory — creates a configured Pino instance
 */
import pino from 'pino';
import type { FluskLoggerOptions } from './types.js';

export type { FluskLoggerOptions };

/**
 * Create a new Pino logger with Flusk defaults.
 * Supports FLUSK_LOG_LEVEL env var and pino-pretty in dev.
 */
export function createLogger(options: FluskLoggerOptions = {}): pino.Logger {
  const level = options.level
    || process.env.FLUSK_LOG_LEVEL
    || 'info';

  const pretty = options.pretty
    ?? process.env.NODE_ENV !== 'production';

  return pino({
    name: options.name || 'flusk',
    level,
    ...(pretty
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}
