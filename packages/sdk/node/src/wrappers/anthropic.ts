import type Anthropic from '@anthropic-ai/sdk'
import type { FluskClient } from '../client.js'
import { trackStream } from './track-stream.js'

function formatMessages(messages: Anthropic.MessageParam[]): string {
  return messages
    .map((msg) => {
      if (typeof msg.content === 'string') return `${msg.role}: ${msg.content}`
      return `${msg.role}: [complex content]`
    })
    .join('\n')
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
        return wrapAnthropicStream(response as any, params, flusk, startTime) as any
      }

      const resp = response as Anthropic.Message
      if ('usage' in resp) {
        trackCall(flusk, params, extractResponse(resp), resp.usage, endTime - startTime)
      }
      return response
    } catch (error) {
      trackError(params, flusk, Date.now() - startTime, error)
      throw error
    }
  } as typeof originalCreate

  return anthropic
}

function extractResponse(response: Anthropic.Message): string {
  return response.content.map((b) => (b.type === 'text' ? b.text : '[non-text]')).join('')
}

function wrapAnthropicStream(
  stream: AsyncIterable<Anthropic.MessageStreamEvent>,
  params: Anthropic.MessageCreateParams,
  flusk: FluskClient,
  startTime: number
): AsyncIterable<Anthropic.MessageStreamEvent> {
  return trackStream(stream, startTime, {
    extractDelta: (event) => {
      if (event.type === 'content_block_delta') {
        const delta = (event as any).delta
        return delta?.type === 'text_delta' ? delta.text : undefined
      }
      return undefined
    },
    extractUsage: (event) => {
      if (event.type === 'message_start') {
        return { promptTokens: (event as any).message?.usage?.input_tokens || 0 }
      }
      if (event.type === 'message_delta') {
        return { completionTokens: (event as any).usage?.output_tokens || 0 }
      }
      return undefined
    },
    onComplete: (result) => trackCall(flusk, params, result.content, result, result.latencyMs),
    onError: (error) => trackError(params, flusk, Date.now() - startTime, error),
  })
}

function trackCall(
  flusk: FluskClient,
  params: Anthropic.MessageCreateParams,
  response: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens?: number },
  latencyMs: number
) {
  const totalTokens = usage.totalTokens ?? usage.promptTokens + usage.completionTokens
  flusk.track({
    provider: 'anthropic', model: params.model, prompt: formatMessages(params.messages),
    response, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens,
    totalTokens, latencyMs, metadata: { streamed: !!params.stream },
  }).catch((e) => console.error('Flusk tracking error:', e))
}

function trackError(
  params: Anthropic.MessageCreateParams, flusk: FluskClient, latencyMs: number, error: unknown
) {
  flusk.track({
    provider: 'anthropic', model: params.model, prompt: formatMessages(params.messages),
    response: '[ERROR]', promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs,
    metadata: { error: error instanceof Error ? error.message : 'Unknown', streamed: !!params.stream },
  }).catch((e) => console.error('Flusk tracking error:', e))
}
