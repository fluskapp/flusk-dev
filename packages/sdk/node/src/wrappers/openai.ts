import type OpenAI from 'openai'
import type { FluskClient } from '../client.js'

function formatMessages(messages: OpenAI.ChatCompletionMessageParam[]): string {
  return messages
    .map((msg) => {
      if (typeof msg.content === 'string') {
        return `${msg.role}: ${msg.content}`
      }
      return `${msg.role}: [complex content]`
    })
    .join('\n')
}

/**
 * Wraps an OpenAI client to automatically track LLM calls in Flusk
 * Note: Only tracks non-streaming requests. Streaming requests are not currently tracked.
 */
export function wrapOpenAI(openai: OpenAI, flusk: FluskClient): OpenAI {
  const originalCreate = openai.chat.completions.create.bind(openai.chat.completions)

  openai.chat.completions.create = async function (...args: Parameters<typeof originalCreate>) {
    const startTime = Date.now()
    const [params] = args

    try {
      const response = await originalCreate(...args)
      const endTime = Date.now()

      // Only track non-streaming responses
      if (!params.stream && 'usage' in response && response.usage) {
        const prompt = formatMessages(params.messages)
        const responseContent = response.choices[0]?.message?.content || ''

        await flusk
          .track({
            provider: 'openai',
            model: params.model,
            prompt,
            response: responseContent,
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
            latencyMs: endTime - startTime,
            metadata: {
              temperature: params.temperature,
              maxTokens: params.max_tokens,
              topP: params.top_p,
              frequencyPenalty: params.frequency_penalty,
              presencePenalty: params.presence_penalty,
            },
          })
          .catch((error) => {
            // Don't fail the original call if tracking fails
            console.error('Failed to track OpenAI call in Flusk:', error)
          })
      }

      return response
    } catch (error) {
      // Still track failed calls for analysis (non-streaming only)
      if (!params.stream) {
        const endTime = Date.now()
        await flusk
          .track({
            provider: 'openai',
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
            console.error('Failed to track OpenAI error in Flusk:', trackingError)
          })
      }

      throw error
    }
  } as typeof originalCreate

  return openai
}
