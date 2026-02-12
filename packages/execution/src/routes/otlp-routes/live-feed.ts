/**
 * WebSocket live feed route for streaming spans to CLI
 */
import type { FastifyInstance } from 'fastify';

export async function liveFeedRoute(app: FastifyInstance): Promise<void> {
  app.get('/feed', { websocket: true }, (socket) => {
    const listener = (span: unknown) => {
      socket.send(JSON.stringify(span));
    };

    app.eventBus?.on('llm-call:created', listener);

    socket.on('close', () => {
      app.eventBus?.off('llm-call:created', listener);
    });
  });
}
