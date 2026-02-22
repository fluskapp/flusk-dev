// --- BEGIN CUSTOM ---
/**
 * Quality benchmark data for LLM models.
 * Scores are approximate and sourced from public leaderboards.
 * MMLU: Massive Multitask Language Understanding (0-100)
 * HumanEval: Code generation benchmark (0-100, pass@1)
 * MT-Bench: Multi-turn conversation quality (0-10)
 */
export interface ModelBenchmarks {
  mmlu: number;
  humanEval: number;
  mtBench: number;
}

export const MODEL_BENCHMARKS: Record<string, ModelBenchmarks> = {
  'gpt-4': { mmlu: 86.4, humanEval: 67.0, mtBench: 8.99 },
  'gpt-4-turbo': { mmlu: 86.5, humanEval: 87.1, mtBench: 9.18 },
  'gpt-4o': { mmlu: 87.2, humanEval: 90.2, mtBench: 9.32 },
  'gpt-4o-mini': { mmlu: 82.0, humanEval: 87.0, mtBench: 8.62 },
  'gpt-3.5-turbo': { mmlu: 70.0, humanEval: 48.1, mtBench: 7.94 },
  'claude-3-opus': { mmlu: 86.8, humanEval: 84.9, mtBench: 9.00 },
  'claude-3.5-sonnet': { mmlu: 88.7, humanEval: 92.0, mtBench: 9.40 },
  'claude-3-haiku': { mmlu: 75.2, humanEval: 75.9, mtBench: 8.30 },
  'command': { mmlu: 75.0, humanEval: 55.0, mtBench: 7.50 },
  'command-light': { mmlu: 61.0, humanEval: 35.0, mtBench: 6.80 },
};

/**
 * Get benchmark comparison between two models.
 * Returns null if benchmarks are not available for either model.
 */
export function compareBenchmarks(
  fromModel: string,
  toModel: string,
): { from: ModelBenchmarks; to: ModelBenchmarks; delta: ModelBenchmarks } | null {
  const from = MODEL_BENCHMARKS[fromModel];
  const to = MODEL_BENCHMARKS[toModel];
  if (!from || !to) return null;
  return {
    from,
    to,
    delta: {
      mmlu: Math.round((to.mmlu - from.mmlu) * 10) / 10,
      humanEval: Math.round((to.humanEval - from.humanEval) * 10) / 10,
      mtBench: Math.round((to.mtBench - from.mtBench) * 100) / 100,
    },
  };
}
// --- END CUSTOM ---
