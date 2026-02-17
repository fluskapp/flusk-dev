# --- BEGIN GENERATED ---
"""Report formatting — markdown and JSON output."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flusk.analysis.cost import calculate_costs

DB_PATH = Path.home() / ".flusk" / "data.db"


def format_report(session_id: str, *, fmt: str = "markdown") -> str:
    """Format a cost report for a session."""
    calls = calculate_costs(session_id)
    if fmt == "json":
        return json.dumps(calls, indent=2, default=str)
    return _markdown_report(session_id, calls)


def _markdown_report(session_id: str, calls: list[dict]) -> str:
    lines = [f"# Flusk Report — {session_id[:8]}", ""]
    total = sum(c.get("cost", 0) for c in calls)
    lines.append("**Total cost:** $" + f"{total:.6f}")
    lines.append(f"**LLM calls:** {len(calls)}")
    lines.append("")
    for c in calls:
        cost_str = f"{c.get('cost', 0):.6f}"
        lines.append(f"- {c['provider']}/{c['model']}: $" + cost_str +
                      f" ({c['input_tokens']}in/{c['output_tokens']}out)")
    return "\n".join(lines)


def get_latest_session() -> str | None:
    """Get the most recent session ID."""
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(str(DB_PATH))
    row = conn.execute(
        "SELECT DISTINCT session_id FROM spans ORDER BY start_time DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return row[0] if row else None


def list_sessions(*, limit: int = 20) -> list[dict]:
    """List recent sessions with span counts."""
    if not DB_PATH.exists():
        return []
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT session_id as id, MIN(start_time) as created_at, COUNT(*) as span_count "
        "FROM spans GROUP BY session_id ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def purge_sessions(*, older_than_days: int = 30) -> int:
    """Delete sessions older than N days. Returns count deleted."""
    if not DB_PATH.exists():
        return 0
    conn = sqlite3.connect(str(DB_PATH))
    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    cutoff_ts = int(cutoff.timestamp() * 1_000_000_000)
    old = conn.execute(
        "SELECT DISTINCT session_id FROM spans WHERE start_time < ?", (cutoff_ts,)
    ).fetchall()
    ids = [r[0] for r in old]
    if ids:
        placeholders = ",".join("?" * len(ids))
        conn.execute("DELETE FROM spans WHERE session_id IN (" + placeholders + ")", ids)
        conn.execute("DELETE FROM llm_calls WHERE session_id IN (" + placeholders + ")", ids)
        conn.commit()
    conn.close()
    return len(ids)
# --- END GENERATED ---
