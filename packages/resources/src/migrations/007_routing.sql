-- Automatic Model Routing tables

CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quality_threshold NUMERIC(3,2) NOT NULL CHECK (quality_threshold BETWEEN 0 AND 1),
  fallback_model TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routing_rules_org ON routing_rules(organization_id);

CREATE TABLE IF NOT EXISTS model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  prompt_category TEXT NOT NULL,
  avg_quality NUMERIC(5,4) NOT NULL DEFAULT 0,
  avg_latency_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_cost_per_1k_tokens NUMERIC(10,6) NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(model, prompt_category)
);

CREATE TABLE IF NOT EXISTS routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES routing_rules(id),
  llm_call_id UUID REFERENCES llm_calls(id),
  selected_model TEXT NOT NULL,
  original_model TEXT NOT NULL,
  reason TEXT NOT NULL,
  cost_saved NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routing_decisions_rule ON routing_decisions(rule_id);
CREATE INDEX idx_routing_decisions_created ON routing_decisions(created_at);
