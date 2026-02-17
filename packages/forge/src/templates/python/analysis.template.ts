/**
 * Python analysis template — cost calculation module.
 *
 * WHY: Generates cost analysis that reads from the SQLite
 * database populated by the span exporter.
 */

/** Render analysis/__init__.py */
export function renderAnalysisInit(): string {
  return `# --- BEGIN GENERATED ---
"""Flusk analysis — cost calculation and reporting."""
# --- END GENERATED ---
`;
}

/** Render analysis/cost.py */
export function renderCostAnalysis(): string {
  return `# --- BEGIN GENERATED ---
"""Cost calculation using generated pricing data."""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path.home() / ".flusk" / "data.db"


def calculate_costs(session_id: str) -> list[dict]:
    """Calculate costs for all LLM calls in a session."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM llm_calls WHERE session_id = ?", (session_id,)
    ).fetchall()
    conn.close()
    results = []
    for row in rows:
        cost = _estimate_cost(row["provider"], row["model"], row["input_tokens"], row["output_tokens"])
        results.append({**dict(row), "cost": cost})
    return results


def _estimate_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate cost from pricing data. Falls back to zero."""
    try:
        from flusk.pricing import openai as openai_pricing
        prices = getattr(openai_pricing, "MODELS", {})
        if model in prices:
            p = prices[model]
            return (input_tokens * p.get("input", 0) + output_tokens * p.get("output", 0)) / 1_000_000
    except ImportError:
        pass
    return 0.0
# --- END GENERATED ---
`;
}
