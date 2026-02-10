-- Add vector column for semantic similarity search
-- Uses pgvector extension (already enabled in init)
-- text-embedding-3-small produces 1536-dimensional vectors

ALTER TABLE llm_calls
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_llm_calls_embedding
  ON llm_calls USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for finding calls that need embeddings generated
CREATE INDEX IF NOT EXISTS idx_llm_calls_no_embedding
  ON llm_calls (created_at DESC)
  WHERE embedding IS NULL;
