import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { costEventBus, type CostEvent } from '../events/cost-event-bus.js'

/**
 * SSE endpoint for real-time cost events
 * GET /api/v1/events/costs
 */
export async function costEventsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/',
    {
      schema: {
        description: 'SSE stream of real-time cost events',
        tags: ['Events'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      // Send initial keepalive
      reply.raw.write(': connected\n\n')

      const onCost = (event: CostEvent) => {
        reply.raw.write(`event: ${event.type}\n`)
        reply.raw.write(`data: ${JSON.stringify(event.data)}\n\n`)
      }

      costEventBus.on('cost', onCost)

      // Keepalive every 30s
      const keepalive = setInterval(() => {
        reply.raw.write(': keepalive\n\n')
      }, 30_000)

      request.raw.on('close', () => {
        costEventBus.off('cost', onCost)
        clearInterval(keepalive)
      })

      // Don't let Fastify close the response
      await new Promise(() => {})
    }
  )
}
