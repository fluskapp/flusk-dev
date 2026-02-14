/** @generated —
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
import { getLogger } from '@flusk/logger';
import { loadConfig } from './config.js';
import { createSdk } from './create-sdk.js';
import { setupAutoFlame } from './utils/auto-register-flame.js';

const logger = getLogger().child({ module: 'otel-register' });
const config = loadConfig();
const spanProcessors = await setupAutoFlame();
const sdk = createSdk(config, { spanProcessors });

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch((err: unknown) => logger.error({ err }, 'shutdown failed'));
});

process.on('SIGINT', () => {
  sdk.shutdown().catch((err: unknown) => logger.error({ err }, 'shutdown failed'));
});

logger.info({ project: config.projectName }, 'instrumentation active');
