ALTER TABLE llm_calls ADD COLUMN session_id TEXT REFERENCES analyze_sessions(id);
CREATE INDEX IF NOT EXISTS idx_llm_calls_session_id ON llm_calls(session_id);
