/**
 * @flusk/otel — Auto-registration entry point
 *
 * Usage: node --require @flusk/otel ./index.js
 * Or:    import '@flusk/otel' at the top of your entry file
 *
 * Env vars:
 *   FLUSK_API_KEY       — Flusk API key (required for auth)
 *   FLUSK_ENDPOINT      — OTLP endpoint (default: https://otel.flusk.dev)
 *   FLUSK_PROJECT_NAME  — Service/project name (default: 'default')
 *   FLUSK_CAPTURE_CONTENT — Capture prompt/response content (default: true)
 */
import { loadConfig } from './config.js';
import { createSdk } from './create-sdk.js';

const config = loadConfig();
const sdk = createSdk(config);

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(console.error);
});

process.on('SIGINT', () => {
  sdk.shutdown().catch(console.error);
});

console.log(`[flusk/otel] Instrumentation active — project: ${config.projectName}`);
