import type Anthropic from '@anthropic-ai/sdk'
import type { FluskClient } from '../client.js'

function formatMessages(messages: Anthropic.MessageParam[]): string {
  return messages
    .map((msg) => {
      if (typeof msg.content === 'string') {
        return `${msg.role}: ${msg.content}`
      }
      return `${msg.role}: [complex content]`
    })
    .join('\n')
}

function extractResponse(response: Anthropic.Message): string {
  return response.content
    .map((block) => {
      if (block.type === 'text') {
        return block.text
      }
      return '[non-text content]'
    })
    .join('')
}

/**
 * Wraps an Anthropic client to automatically track LLM calls in Flusk
 * Note: Only tracks non-streaming requests. Streaming requests are not currently tracked.
 */
export function wrapAnthropic(anthropic: Anthropic, flusk: FluskClient): Anthropic {
  const originalCreate = anthropic.messages.create.bind(anthropic.messages)

  anthropic.messages.create = async function (...args: Parameters<typeof originalCreate>) {
    const startTime = Date.now()
    const [params] = args

    try {
      const response = await originalCreate(...args)
      const endTime = Date.now()

      // Only track non-streaming responses
      if (!params.stream && 'usage' in response) {
        const prompt = formatMessages(params.messages)
        const responseContent = extractResponse(response)

        await flusk
          .track({
            provider: 'anthropic',
            model: params.model,
            prompt,
            response: responseContent,
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            latencyMs: endTime - startTime,
            metadata: {
              temperature: params.temperature,
              maxTokens: params.max_tokens,
              topP: params.top_p,
              topK: params.top_k,
              stopReason: response.stop_reason,
            },
          })
          .catch((error) => {
            // Don't fail the original call if tracking fails
            console.error('Failed to track Anthropic call in Flusk:', error)
          })
      }

      return response
    } catch (error) {
      // Still track failed calls for analysis (non-streaming only)
      if (!params.stream) {
        const endTime = Date.now()
        await flusk
          .track({
            provider: 'anthropic',
            model: params.model,
            prompt: formatMessages(params.messages),
            response: '[ERROR]',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latencyMs: endTime - startTime,
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          })
          .catch((trackingError) => {
            console.error('Failed to track Anthropic error in Flusk:', trackingError)
          })
      }

      throw error
    }
  } as typeof originalCreate

  return anthropic
}
