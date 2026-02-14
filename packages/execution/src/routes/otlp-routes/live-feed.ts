/** @generated —
 * WebSocket live feed route for streaming spans to CLI
 */
import type { FastifyInstance } from 'fastify';

export async function liveFeedRoute(app: FastifyInstance): Promise<void> {
  app.get('/feed', { websocket: true }, (socket) => {
    const listener = (span: unknown) => {
      socket.send(JSON.stringify(span));
    };

    const profileStarted = (data: unknown) => {
      socket.send(JSON.stringify({ type: 'profile:started', data }));
    };
    const profileCompleted = (data: unknown) => {
      socket.send(JSON.stringify({ type: 'profile:completed', data }));
    };
    const profileCorrelation = (data: unknown) => {
      socket.send(JSON.stringify({ type: 'profile:correlation', data }));
    };

    app.eventBus?.on('llm-call:created', listener);
    app.eventBus?.on('profile:started', profileStarted);
    app.eventBus?.on('profile:completed', profileCompleted);
    app.eventBus?.on('profile:correlation', profileCorrelation);

    socket.on('close', () => {
      app.eventBus?.off('llm-call:created', listener);
      app.eventBus?.off('profile:started', profileStarted);
      app.eventBus?.off('profile:completed', profileCompleted);
      app.eventBus?.off('profile:correlation', profileCorrelation);
    });
  });
}
