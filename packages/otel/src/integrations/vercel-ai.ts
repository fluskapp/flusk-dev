// --- BEGIN CUSTOM ---
/**
 * Vercel AI SDK telemetry adapter for Flusk.
 * Returns a telemetry config object compatible with AI SDK's
 * experimental_telemetry option.
 */

export interface FluskTelemetryOptions {
  agent?: string;
}

/**
 * Creates a Vercel AI SDK telemetry configuration that routes
 * traces through the active OTel provider (set up by @flusk/otel).
 *
 * Usage:
 * ```ts
 * import { fluskTelemetry } from '@flusk/otel/integrations/vercel-ai';
 * const result = await generateText({
 *   model: openai('gpt-4o'),
 *   prompt: 'Hello',
 *   experimental_telemetry: fluskTelemetry({ agent: 'my-app' }),
 * });
 * ```
 */
export function fluskTelemetry(opts?: FluskTelemetryOptions) {
  return {
    isEnabled: true,
    functionId: opts?.agent || 'flusk',
    metadata: {
      ...(opts?.agent ? { 'flusk.agent': opts.agent } : {}),
    },
  };
}
// --- END CUSTOM ---
