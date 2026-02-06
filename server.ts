/**
 * Flusk Platform - Development Server
 *
 * Simple server entry point for local development and testing.
 * For production, use Platformatic Watt deployment.
 */

import { createApp } from '@flusk/execution'

async function start() {
  const PORT = Number(process.env.PORT) || 3000
  const HOST = process.env.HOST || '0.0.0.0'

  const app = await createApp({
    logger: true,
    requireAuth: false, // Disable auth for local dev
    cors: {
      origin: true, // Allow all origins in development
      credentials: true,
    },
  })

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`\n🚀 Flusk server running at http://localhost:${PORT}`)
    console.log(`\n📚 API Documentation:`)
    console.log(`   Health:      GET  http://localhost:${PORT}/health`)
    console.log(`   LLM Calls:   POST http://localhost:${PORT}/api/v1/llm-calls`)
    console.log(`   Get Call:    GET  http://localhost:${PORT}/api/v1/llm-calls/:id`)
    console.log(`   Cache Check: GET  http://localhost:${PORT}/api/v1/llm-calls/by-hash/:hash`)
    console.log(`\n💡 Run the example:`)
    console.log(`   cd examples && pnpm start\n`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()
