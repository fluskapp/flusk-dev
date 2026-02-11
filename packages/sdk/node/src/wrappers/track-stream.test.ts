import { describe, it, expect, vi } from 'vitest'
import { trackStream } from './track-stream.js'

async function* makeStream<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) yield item
}

describe('trackStream', () => {
  it('passes chunks through unchanged', async () => {
    const chunks = [{ text: 'Hello' }, { text: ' world' }]
    const onComplete = vi.fn()
    const wrapped = trackStream(makeStream(chunks), Date.now(), {
      extractDelta: (c) => c.text,
      extractUsage: () => undefined,
      onComplete,
    })

    const received: typeof chunks = []
    for await (const chunk of wrapped) received.push(chunk)

    expect(received).toEqual(chunks)
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('accumulates content and reports on completion', async () => {
    const chunks = [{ text: 'Hello' }, { text: ' world' }]
    const onComplete = vi.fn()
    const wrapped = trackStream(makeStream(chunks), Date.now() - 100, {
      extractDelta: (c) => c.text,
      extractUsage: () => undefined,
      onComplete,
    })

    for await (const _ of wrapped) {} // consume

    const result = onComplete.mock.calls[0][0]
    expect(result.content).toBe('Hello world')
    expect(result.latencyMs).toBeGreaterThanOrEqual(100)
    expect(result.totalTokens).toBe(0)
  })

  it('extracts token usage from chunks', async () => {
    const chunks = [
      { text: 'Hi', usage: null },
      { text: '!', usage: { prompt: 10, completion: 5 } },
    ]
    const onComplete = vi.fn()
    const wrapped = trackStream(makeStream(chunks), Date.now(), {
      extractDelta: (c) => c.text,
      extractUsage: (c) =>
        c.usage ? { promptTokens: c.usage.prompt, completionTokens: c.usage.completion } : undefined,
      onComplete,
    })

    for await (const _ of wrapped) {}

    const result = onComplete.mock.calls[0][0]
    expect(result.promptTokens).toBe(10)
    expect(result.completionTokens).toBe(5)
    expect(result.totalTokens).toBe(15)
  })

  it('calls onError when stream throws', async () => {
    async function* errorStream() {
      yield { text: 'ok' }
      throw new Error('stream broke')
    }
    const onError = vi.fn()
    const onComplete = vi.fn()
    const wrapped = trackStream(errorStream(), Date.now(), {
      extractDelta: (c) => c.text,
      extractUsage: () => undefined,
      onComplete,
      onError,
    })

    const received: unknown[] = []
    await expect(async () => {
      for await (const chunk of wrapped) received.push(chunk)
    }).rejects.toThrow('stream broke')

    expect(onError).toHaveBeenCalledOnce()
    expect(onComplete).not.toHaveBeenCalled()
    expect(received).toHaveLength(1)
  })

  it('handles empty stream', async () => {
    const onComplete = vi.fn()
    const wrapped = trackStream(makeStream([]), Date.now(), {
      extractDelta: () => undefined,
      extractUsage: () => undefined,
      onComplete,
    })

    for await (const _ of wrapped) {}

    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0].content).toBe('')
  })
})
