/**
 * Embedding Client - Vector Embedding Generation
 * Connects to FastAPI ML service for generating text embeddings
 * NOTE: Phase 2 uses openai-embedding.client.ts instead
 */

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface EmbeddingBatchResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

/**
 * EmbeddingClient - Generates vector embeddings via ML service
 */
export class EmbeddingClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://ml.plt.local') {
    this.baseUrl = baseUrl;
  }

  /** Generate embedding for a single text */
  async generate(text: string, model?: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding failed: ${response.status} - ${error}`);
    }

    return (await response.json()) as EmbeddingResponse;
  }

  /** Generate embeddings for multiple texts in batch */
  async generateBatch(
    texts: string[],
    model?: string
  ): Promise<EmbeddingBatchResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, model }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Batch embedding failed: ${response.status} - ${error}`);
    }

    return (await response.json()) as EmbeddingBatchResponse;
  }

  /** Health check for ML service */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/** Singleton embedding client instance */
export const embeddingClient = new EmbeddingClient(
  process.env.ML_SERVICE_URL || 'http://ml.plt.local'
);
