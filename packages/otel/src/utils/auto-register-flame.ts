/**
 * Auto-register flame profiling when @platformatic/flame is available
 * Returns SpanProcessors to add to the OTel SDK
 */
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getLogger } from '@flusk/logger';
import { isFlameAvailable } from './detect-flame.js';
import { createAutoProfileProcessor } from '../hooks/auto-profile.hook.js';
import type { ProfileMode, ProfilerDecorator, FlameApi } from '../plugins/flame-profile.plugin.js';

const logger = getLogger().child({ module: 'auto-register-flame' });

/**
 * Checks flame availability and returns span processors for auto-profiling.
 * Returns empty array if flame is not installed or profiling is disabled.
 */
export async function setupAutoFlame(): Promise<SpanProcessor[]> {
  const mode = (process.env['FLUSK_PROFILE_MODE'] ?? 'auto') as ProfileMode;

  if (mode === 'off') return [];

  const available = await isFlameAvailable();
  if (!available) return [];

  let flame: FlameApi;
  try {
    flame = await import('@platformatic/flame') as unknown as FlameApi;
  } catch {
    return [];
  }

  const profiler: ProfilerDecorator = {
    mode,
    start: async (traceIds?: string[]) => {
      try {
        const result = await flame.startProfiling({ duration: 10_000 });
        void result; void traceIds;
        return true;
      } catch {
        return false;
      }
    },
    stop: async () => { /* no-op */ },
  };

  logger.info('flame detected, auto-profiling enabled');

  return [createAutoProfileProcessor({ profiler })];
}
