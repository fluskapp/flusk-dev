import type Anthropic from '@anthropic-ai/sdk'
import type { FluskClient } from '../client.js'

function formatMessages(messages: Anthropic.MessageParam[]): string {
  return messages
    .map((msg) => {
      if (typeof msg.content === 'string') return `${msg.role}: ${msg.content}`
      return `${msg.role}: [complex content]`
    })
    .join('\n')
}

function extractResponse(response: Anthropic.Message): string {
  return response.content
    .map((block) => (block.type === 'text' ? block.text : '[non-text]'))
    .join('')
}

/**
 * Wraps an Anthropic client to automatically track all LLM calls
 * Supports both streaming and non-streaming requests
 */
export function wrapAnthropic(anthropic: Anthropic, flusk: FluskClient): Anthropic {
  const originalCreate = anthropic.messages.create.bind(anthropic.messages)

  anthropic.messages.create = async function (...args: Parameters<typeof originalCreate>) {
    const startTime = Date.now()
    const [params] = args

    try {
      const response = await originalCreate(...args)
      const endTime = Date.now()

      if (params.stream) {
        return wrapStream(response as any, params, flusk, startTime) as any
      }

      // Non-streaming
      const resp = response as Anthropic.Message
      if ('usage' in resp) {
        trackNonStreaming(resp, params, flusk, endTime - startTime)
      }
      return response
    } catch (error) {
      trackError(params, flusk, Date.now() - startTime, error)
      throw error
    }
  } as typeof originalCreate

  return anthropic
}

function trackNonStreaming(
  resp: Anthropic.Message,
  params: Anthropic.MessageCreateParams,
  flusk: FluskClient,
  latencyMs: number
) {
  flusk
    .track({
      provider: 'anthropic',
      model: params.model,
      prompt: formatMessages(params.messages),
      response: extractResponse(resp),
      promptTokens: resp.usage.input_tokens,
      completionTokens: resp.usage.output_tokens,
      totalTokens: resp.usage.input_tokens + resp.usage.output_tokens,
      latencyMs,
      metadata: { temperature: params.temperature, stopReason: resp.stop_reason },
    })
    .catch((e) => console.error('Flusk tracking error:', e))
}

function trackError(
  params: Anthropic.MessageCreateParams,
  flusk: FluskClient,
  latencyMs: number,
  error: unknown
) {
  if (!params.stream) {
    flusk
      .track({
        provider: 'anthropic',
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
 * Wrap Anthropic streaming to collect chunks and track after completion
 */
function wrapStream(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
  params: Anthropic.MessageCreateParams,
  flusk: FluskClient,
  startTime: number
): AsyncIterable<Anthropic.MessageStreamEvent> {
  const chunks: string[] = []
  let inputTokens = 0
  let outputTokens = 0

  const original = stream[Symbol.asyncIterator]()

  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          const result = await original.next()
          if (result.done) {
            const latencyMs = Date.now() - startTime
            flusk
              .track({
                provider: 'anthropic',
                model: params.model,
                prompt: formatMessages(params.messages),
                response: chunks.join(''),
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: inputTokens + outputTokens,
                latencyMs,
                metadata: { streamed: true },
              })
              .catch((e) => console.error('Flusk tracking error:', e))
            return result
          }
          const event = result.value
          if (event.type === 'content_block_delta') {
            const delta = (event as any).delta
            if (delta?.type === 'text_delta') chunks.push(delta.text)
          }
          if (event.type === 'message_start') {
            inputTokens = (event as any).message?.usage?.input_tokens || 0
          }
          if (event.type === 'message_delta') {
            outputTokens = (event as any).usage?.output_tokens || 0
          }
          return result
        },
      }
    },
  } as any
}
