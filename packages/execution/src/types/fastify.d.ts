/**
 * Fastify type augmentations for custom decorators
 */
import type { EventEmitter } from 'node:events';

declare module 'fastify' {
  interface FastifyInstance {
    eventBus?: EventEmitter;
  }
}
