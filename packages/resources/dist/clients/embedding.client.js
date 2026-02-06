/**
 * Embedding Client - Vector Embedding Generation
 * Connects to FastAPI ML service for generating text embeddings
 */
/**
 * EmbeddingClient - Generates vector embeddings via ML service
 */
export class EmbeddingClient {
    baseUrl;
    constructor(baseUrl = 'http://ml.plt.local') {
        this.baseUrl = baseUrl;
    }
    /**
     * Generate embedding for a single text
     * @param text - Text to embed
     * @param model - Optional model name (defaults to service default)
     * @returns Embedding vector
     */
    async generate(text, model) {
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
            throw new Error(`Embedding generation failed: ${response.status} - ${error}`);
        }
        return (await response.json());
    }
    /**
     * Generate embeddings for multiple texts in batch
     * @param texts - Array of texts to embed
     * @param model - Optional model name (defaults to service default)
     * @returns Array of embedding vectors
     */
    async generateBatch(texts, model) {
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
            throw new Error(`Batch embedding generation failed: ${response.status} - ${error}`);
        }
        return (await response.json());
    }
    /**
     * Health check for ML service
     * @returns true if service is healthy
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
/**
 * Singleton embedding client instance
 * Uses ML service URL from environment or defaults to ml.plt.local
 */
export const embeddingClient = new EmbeddingClient(process.env.ML_SERVICE_URL || 'http://ml.plt.local');
//# sourceMappingURL=embedding.client.js.map