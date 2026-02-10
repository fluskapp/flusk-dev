import type OpenAI from 'openai'
import type { FluskClient } from '../client.js'

function formatMessages(messages: OpenAI.ChatCompletionMessageParam[]): string {
  return messages
    .map((msg) => {
      if (typeof msg.content === 'string') return `${msg.role}: ${msg.content}`
      return `${msg.role}: [complex content]`
    })
    .join('\n')
}

/**
 * Wraps an OpenAI client to automatically track all LLM calls
 * Supports both streaming and non-streaming requests
 */
export function wrapOpenAI(openai: OpenAI, flusk: FluskClient): OpenAI {
  const originalCreate = openai.chat.completions.create.bind(openai.chat.completions)

  openai.chat.completions.create = async function (...args: Parameters<typeof originalCreate>) {
    const startTime = Date.now()
    const [params] = args

    try {
      const response = await originalCreate(...args)
      const endTime = Date.now()

      if (params.stream) {
        return wrapStream(response as any, params, flusk, startTime) as any
      }

      // Non-streaming: track immediately
      const resp = response as OpenAI.ChatCompletion
      if ('usage' in resp && resp.usage) {
        trackNonStreaming(resp, params, flusk, endTime - startTime)
      }
      return response
    } catch (error) {
      trackError(params, flusk, Date.now() - startTime, error)
      throw error
    }
  } as typeof originalCreate

  return openai
}

function trackNonStreaming(
  resp: OpenAI.ChatCompletion,
  params: OpenAI.ChatCompletionCreateParams,
  flusk: FluskClient,
  latencyMs: number
) {
  flusk
    .track({
      provider: 'openai',
      model: params.model,
      prompt: formatMessages(params.messages),
      response: resp.choices[0]?.message?.content || '',
      promptTokens: resp.usage!.prompt_tokens,
      completionTokens: resp.usage!.completion_tokens,
      totalTokens: resp.usage!.total_tokens,
      latencyMs,
      metadata: { temperature: params.temperature, maxTokens: params.max_tokens },
    })
    .catch((e) => console.error('Flusk tracking error:', e))
}

function trackError(
  params: OpenAI.ChatCompletionCreateParams,
  flusk: FluskClient,
  latencyMs: number,
  error: unknown
) {
  if (!params.stream) {
    flusk
      .track({
        provider: 'openai',
        model: params.model,
        prompt: formatMessages(params.messages),
        response: '[ERROR]',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        metadata: { error: error instanceof Error ? error.message : 'Unknown' },
      })
      .catch((e) => console.error('Flusk tracking error:', e))
  }
}

/**
 * Wrap a streaming response to collect chunks and track after completion
 */
function wrapStream(
  stream: AsyncIterable<OpenAI.ChatCompletionChunk>,
  params: OpenAI.ChatCompletionCreateParams,
  flusk: FluskClient,
  startTime: number
): AsyncIterable<OpenAI.ChatCompletionChunk> {
  const chunks: string[] = []
  let promptTokens = 0
  let completionTokens = 0

  const original = stream[Symbol.asyncIterator]()

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          const result = await original.next()
          if (result.done) {
            // Stream complete — track the full call
            const latencyMs = Date.now() - startTime
            const totalTokens = promptTokens + completionTokens
            flusk
              .track({
                provider: 'openai',
                model: params.model,
                prompt: formatMessages(params.messages),
                response: chunks.join(''),
                promptTokens,
                completionTokens,
                totalTokens,
                latencyMs,
                metadata: { streamed: true },
              })
              .catch((e) => console.error('Flusk tracking error:', e))
            return result
          }
          const chunk = result.value
          const delta = chunk.choices[0]?.delta?.content
          if (delta) chunks.push(delta)
          // Collect usage from final chunk (OpenAI stream_options)
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens
            completionTokens = chunk.usage.completion_tokens
          }
          return result
        },
      }
    },
  } as any
}
