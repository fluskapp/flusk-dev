/**
 * @flusk/otel — Zero-touch OpenTelemetry auto-instrumentation for Flusk
 *
 * Re-exports for programmatic access. Most users just need:
 *   node --require @flusk/otel ./index.js
 */
export { loadConfig } from './config.js';
export type { FluskOtelConfig } from './config.js';
export { createSdk } from './create-sdk.js';
export type { CreateSdkOptions } from './create-sdk.js';
export { SqliteSpanExporter, parseReadableSpan } from './exporters/index.js';
export { resolveExporter, resolveMode } from './utils/resolve-exporter.js';
export type { FluskMode } from './utils/resolve-exporter.js';
export { isFlameAvailable, resetFlameDetectionCache } from './utils/detect-flame.js';
export { setupAutoFlame } from './utils/auto-register-flame.js';
export { flameProfilePlugin } from './plugins/flame-profile.plugin.js';
export type { ProfilerDecorator, ProfileMode, FlameProfileOptions } from './plugins/flame-profile.plugin.js';
export { createAutoProfileProcessor } from './hooks/auto-profile.hook.js';
export type { AutoProfileHookOptions } from './hooks/auto-profile.hook.js';
