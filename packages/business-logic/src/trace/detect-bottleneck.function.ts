import { SpanEntity } from '@flusk/types';

export interface BottleneckResult {
  slowest: SpanEntity | null;
  mostExpensive: SpanEntity | null;
}

/**
 * Find the slowest and most expensive span in a trace
 * Pure function — no I/O
 */
export function detectBottleneck(spans: SpanEntity[]): BottleneckResult {
  const completed = spans.filter((s) => s.status === 'completed');

  if (completed.length === 0) {
    return { slowest: null, mostExpensive: null };
  }

  const slowest = completed.reduce((max, s) =>
    s.latencyMs > max.latencyMs ? s : max
  );

  const mostExpensive = completed.reduce((max, s) =>
    s.cost > max.cost ? s : max
  );

  return { slowest, mostExpensive };
}
