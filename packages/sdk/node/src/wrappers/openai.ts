import type OpenAI from 'openai'
import type { FluskClient } from '../client.js'
import { trackStream } from './track-stream.js'

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
        return wrapOpenAIStream(response as any, params, flusk, startTime) as any
      }

      const resp = response as OpenAI.ChatCompletion
      if ('usage' in resp && resp.usage) {
        trackCall(flusk, params, resp.choices[0]?.message?.content || '', resp.usage, endTime - startTime)
      }
      return response
    } catch (error) {
      trackError(params, flusk, Date.now() - startTime, error)
      throw error
    }
  } as typeof originalCreate

  return openai
}

function wrapOpenAIStream(
  stream: AsyncIterable<OpenAI.ChatCompletionChunk>,
  params: OpenAI.ChatCompletionCreateParams,
  flusk: FluskClient,
  startTime: number
): AsyncIterable<OpenAI.ChatCompletionChunk> {
  return trackStream(stream, startTime, {
    extractDelta: (chunk) => chunk.choices[0]?.delta?.content ?? undefined,
    extractUsage: (chunk) =>
      chunk.usage ? { promptTokens: chunk.usage.prompt_tokens, completionTokens: chunk.usage.completion_tokens } : undefined,
    onComplete: (result) => trackCall(flusk, params, result.content, result, result.latencyMs),
    onError: (error) => trackError(params, flusk, Date.now() - startTime, error),
  })
}

function trackCall(
  flusk: FluskClient,
  params: OpenAI.ChatCompletionCreateParams,
  response: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens?: number },
  latencyMs: number
) {
  const totalTokens = usage.totalTokens ?? usage.promptTokens + usage.completionTokens
  flusk.track({
    provider: 'openai', model: params.model, prompt: formatMessages(params.messages),
    response, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens,
    totalTokens, latencyMs, metadata: { streamed: !!params.stream },
  }).catch((e) => console.error('Flusk tracking error:', e))
}

function trackError(
  params: OpenAI.ChatCompletionCreateParams, flusk: FluskClient, latencyMs: number, error: unknown
) {
  flusk.track({
    provider: 'openai', model: params.model, prompt: formatMessages(params.messages),
    response: '[ERROR]', promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs,
    metadata: { error: error instanceof Error ? error.message : 'Unknown', streamed: !!params.stream },
  }).catch((e) => console.error('Flusk tracking error:', e))
}
