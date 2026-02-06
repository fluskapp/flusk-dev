/**
 * Embedding Client - Vector Embedding Generation
 * Connects to FastAPI ML service for generating text embeddings
 */
export interface EmbeddingRequest {
    text: string;
    model?: string;
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
export declare class EmbeddingClient {
    private baseUrl;
    constructor(baseUrl?: string);
    /**
     * Generate embedding for a single text
     * @param text - Text to embed
     * @param model - Optional model name (defaults to service default)
     * @returns Embedding vector
     */
    generate(text: string, model?: string): Promise<EmbeddingResponse>;
    /**
     * Generate embeddings for multiple texts in batch
     * @param texts - Array of texts to embed
     * @param model - Optional model name (defaults to service default)
     * @returns Array of embedding vectors
     */
    generateBatch(texts: string[], model?: string): Promise<EmbeddingBatchResponse>;
    /**
     * Health check for ML service
     * @returns true if service is healthy
     */
    healthCheck(): Promise<boolean>;
}
/**
 * Singleton embedding client instance
 * Uses ML service URL from environment or defaults to ml.plt.local
 */
export declare const embeddingClient: EmbeddingClient;
//# sourceMappingURL=embedding.client.d.ts.map