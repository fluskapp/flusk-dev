export interface FluskClientConfig {
  apiKey: string
  baseUrl?: string
}

export interface LLMCallData {
  organizationId?: string
  provider: 'openai' | 'anthropic' | 'other'
  model: string
  prompt: string
  response: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost?: number
  latencyMs: number
  metadata?: Record<string, unknown>
}

export interface ConversionSuggestion {
  id: string
  organizationId: string
  callSignature: string
  frequency: number
  totalCost: number
  potentialSavings: number
  confidence: number
  suggestedAutomation: string
  status: 'pending' | 'approved' | 'rejected' | 'implemented'
  createdAt: string
  updatedAt: string
}

export interface OptimizationSuggestion {
  id: string
  organizationId: string
  type: 'cache-config' | 'model-swap' | 'prompt-dedup' | 'batch-merge'
  title: string
  description: string
  estimatedSavingsPerMonth: number
  generatedCode: string
  language: 'typescript' | 'python' | 'json'
  status: 'suggested' | 'applied' | 'dismissed'
  sourcePatternId: string | null
  createdAt: string
}

export interface RouteOptions {
  ruleId: string
  prompt: string
  tokenCount: number
  originalModel: string
}

export interface RouteResult {
  selectedModel: string
  reason: string
  complexity: string
  expectedQuality: number
}

export class FluskClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(config: FluskClientConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.flusk.ai'
  }

  /**
   * Track an LLM API call for analysis and optimization
   */
  async track(llmCall: LLMCallData): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/llm-calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(llmCall),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to track LLM call: ${response.status} ${errorText}`)
    }
  }

  /**
   * Get conversion suggestions for optimizing LLM calls
   */
  async getSuggestions(organizationId?: string): Promise<ConversionSuggestion[]> {
    const url = new URL(`${this.baseUrl}/api/v1/conversions/suggestions`)
    if (organizationId) {
      url.searchParams.set('organizationId', organizationId)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get suggestions: ${response.status} ${errorText}`)
    }

    return response.json() as Promise<ConversionSuggestion[]>
  }

  /**
   * Get optimization suggestions for the organization
   */
  async getOptimizations(): Promise<OptimizationSuggestion[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/optimizations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get optimizations: ${response.status} ${errorText}`)
    }

    return response.json() as Promise<OptimizationSuggestion[]>
  }

  /**
   * Get generated code for a specific optimization
   */
  async getOptimizationCode(id: string): Promise<{ code: string; language: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/optimizations/${id}/code`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get optimization code: ${response.status} ${errorText}`)
    }

    return response.json() as Promise<{ code: string; language: string }>
  }

  /**
   * Ask Flusk which model to use for a given prompt (opt-in routing)
   */
  async route(options: RouteOptions): Promise<RouteResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Routing failed: ${response.status} ${errorText}`)
    }

    return response.json() as Promise<RouteResult>
  }
}
