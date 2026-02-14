/** @generated —
 * Singleton logger instance
 */
import type pino from 'pino';
import { createLogger } from './create-logger.js';

let _instance: pino.Logger | null = null;

/** Get the shared logger instance (lazy-created on first call) */
export function getLogger(): pino.Logger {
  if (!_instance) _instance = createLogger();
  return _instance;
}

/** Replace the shared logger instance (useful for testing) */
export function setLogger(logger: pino.Logger): void {
  _instance = logger;
}

/** Reset the singleton (mainly for tests) */
export function resetLogger(): void {
  _instance = null;
}
