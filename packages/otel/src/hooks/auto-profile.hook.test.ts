import { describe, it, expect, vi } from 'vitest';
import { createAutoProfileProcessor } from './auto-profile.hook.js';
import type { ProfilerDecorator } from '../plugins/flame-profile.plugin.js';

function makeMockSpan(name: string, traceId: string) {
  return {
    name,
    spanContext: () => ({ traceId, spanId: 'abc', traceFlags: 1 }),
    constructor: { name: 'Span' },
  } as never;
}

describe('auto-profile.hook', () => {
  it('triggers profiling on LLM span in auto mode', () => {
    const profiler: ProfilerDecorator = {
      mode: 'auto',
      start: vi.fn().mockResolvedValue(true),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createAutoProfileProcessor({ profiler });
    processor.onStart(makeMockSpan('openai.chat', 'trace-123'), {} as any);

    expect(profiler.start).toHaveBeenCalledWith(['trace-123']);
  });

  it('skips non-LLM spans', () => {
    const profiler: ProfilerDecorator = {
      mode: 'auto',
      start: vi.fn(),
      stop: vi.fn(),
    };

    const processor = createAutoProfileProcessor({ profiler });
    processor.onStart(makeMockSpan('http.request', 'trace-456'), {} as any);

    expect(profiler.start).not.toHaveBeenCalled();
  });

  it('skips when mode is not auto', () => {
    const profiler: ProfilerDecorator = {
      mode: 'manual',
      start: vi.fn(),
      stop: vi.fn(),
    };

    const processor = createAutoProfileProcessor({ profiler });
    processor.onStart(makeMockSpan('openai.chat', 'trace-789'), {} as any);

    expect(profiler.start).not.toHaveBeenCalled();
  });

  it('calls stop on shutdown', async () => {
    const profiler: ProfilerDecorator = {
      mode: 'auto',
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createAutoProfileProcessor({ profiler });
    await processor.shutdown();

    expect(profiler.stop).toHaveBeenCalled();
  });
});
