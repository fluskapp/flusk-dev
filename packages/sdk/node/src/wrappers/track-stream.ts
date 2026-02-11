/**
 * Generic stream tracking utility
 * Wraps an async iterable, accumulates data, and calls onComplete when done
 * Zero added latency — chunks pass through immediately
 */
export interface StreamTrackingOptions<T> {
  /** Extract text content from a chunk (return undefined to skip) */
  extractDelta: (chunk: T) => string | undefined
  /** Extract token usage from a chunk (e.g., final chunk with usage) */
  extractUsage: (chunk: T) => { promptTokens?: number; completionTokens?: number } | undefined
  /** Called after stream completes with accumulated data */
  onComplete: (result: StreamResult) => void
  /** Called if the stream errors */
  onError?: (error: unknown) => void
}

export interface StreamResult {
  content: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
}

/**
 * Wrap an async iterable stream for background tracking
 * The consumer receives chunks with zero added latency
 */
export function trackStream<T>(
  stream: AsyncIterable<T>,
  startTime: number,
  options: StreamTrackingOptions<T>
): AsyncIterable<T> {
  const chunks: string[] = []
  let promptTokens = 0
  let completionTokens = 0
  const original = stream[Symbol.asyncIterator]()

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          try {
            const result = await original.next()
            if (result.done) {
              const totalTokens = promptTokens + completionTokens
              options.onComplete({
                content: chunks.join(''),
                promptTokens,
                completionTokens,
                totalTokens,
                latencyMs: Date.now() - startTime,
              })
              return result
            }
            const delta = options.extractDelta(result.value)
            if (delta) chunks.push(delta)
            const usage = options.extractUsage(result.value)
            if (usage) {
              if (usage.promptTokens !== undefined) promptTokens = usage.promptTokens
              if (usage.completionTokens !== undefined) completionTokens = usage.completionTokens
            }
            return result
          } catch (error) {
            options.onError?.(error)
            throw error
          }
        },
      }
    },
  } as AsyncIterable<T>
}
