/**
 * Embedding Client - Vector Embedding Generation
 * Connects to FastAPI ML service for generating text embeddings
 */

export interface EmbeddingRequest {
  text: string;
  model?: string; // Optional model specification
}

export interface EmbeddingBatchRequest {
  texts: string[];
  model?: string;
}

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

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @param model - Optional model name (defaults to service default)
   * @returns Embedding vector
   */
  async generate(text: string, model?: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Embedding generation failed: ${response.status} - ${error}`
      );
    }

    return (await response.json()) as EmbeddingResponse;
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @param model - Optional model name (defaults to service default)
   * @returns Array of embedding vectors
   */
  async generateBatch(
    texts: string[],
    model?: string
  ): Promise<EmbeddingBatchResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Batch embedding generation failed: ${response.status} - ${error}`
      );
    }

    return (await response.json()) as EmbeddingBatchResponse;
  }

  /**
   * Health check for ML service
   * @returns true if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton embedding client instance
 * Uses ML service URL from environment or defaults to ml.plt.local
 */
export const embeddingClient = new EmbeddingClient(
  process.env.ML_SERVICE_URL || 'http://ml.plt.local'
);
