/** @generated —
 * Event bus plugin — in-process pub/sub for real-time span streaming
 */
import fp from 'fastify-plugin';
import { EventEmitter } from 'node:events';

export const plugin = fp(
  async (app) => {
    const bus = new EventEmitter();
    bus.setMaxListeners(100);
    app.decorate('eventBus', bus);
    app.addHook('onClose', () => bus.removeAllListeners());
  },
  { name: 'flusk-event-bus' }
);
