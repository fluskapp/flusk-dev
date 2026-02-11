/**
 * @flusk/otel — Zero-touch OpenTelemetry auto-instrumentation for Flusk
 *
 * Re-exports for programmatic access. Most users just need:
 *   node --require @flusk/otel ./index.js
 */
export { loadConfig } from './config.js';
export type { FluskOtelConfig } from './config.js';
export { createSdk } from './create-sdk.js';
