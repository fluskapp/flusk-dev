import { describe, it, expect } from 'vitest';
import { createLogger } from '../create-logger.js';

describe('createLogger', () => {
  it('should return a pino logger instance', () => {
    const logger = createLogger({ pretty: false });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should respect level option', () => {
    const logger = createLogger({ level: 'debug', pretty: false });
    expect(logger.level).toBe('debug');
  });

  it('should default to info level', () => {
    const logger = createLogger({ pretty: false });
    expect(logger.level).toBe('info');
  });

  it('should support child loggers', () => {
    const logger = createLogger({ pretty: false });
    const child = logger.child({ module: 'test' });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
  });
});
