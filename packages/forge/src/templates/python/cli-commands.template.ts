/**
 * Python CLI secondary commands template.
 *
 * WHY: Keeps cli.template.ts under 100 lines by splitting
 * report, history, and purge into a separate file.
 */

/** Render report.py — show last analysis */
export function renderReportCli(): string {
  return `# --- BEGIN GENERATED ---
"""Flusk report command — show last analysis report."""

from __future__ import annotations

import click

from flusk.analysis.report import format_report, get_latest_session


@click.command()
@click.argument("session_id", required=False)
@click.option("-f", "--format", "fmt", default="markdown", type=click.Choice(["markdown", "json"]))
def report(session_id: str | None, fmt: str) -> None:
    """Show analysis report. Defaults to latest session."""
    sid = session_id or get_latest_session()
    if not sid:
        click.echo("No sessions found. Run 'flusk analyze' first.")
        raise SystemExit(1)
    click.echo(format_report(sid, fmt=fmt))
# --- END GENERATED ---
`;
}

/** Render history.py — list past sessions */
export function renderHistoryCli(): string {
  return `# --- BEGIN GENERATED ---
"""Flusk history command — list past analysis sessions."""

from __future__ import annotations

import click

from flusk.analysis.report import list_sessions


@click.command()
@click.option("-n", "--limit", default=20, help="Max sessions to show")
def history(limit: int) -> None:
    """List past analysis sessions."""
    sessions = list_sessions(limit=limit)
    if not sessions:
        click.echo("No sessions found.")
        return
    for s in sessions:
        click.echo(f"{s['id'][:8]}  {s['created_at']}  spans={s['span_count']}")
# --- END GENERATED ---
`;
}

/** Render purge.py — delete old sessions */
export function renderPurgeCli(): string {
  return `# --- BEGIN GENERATED ---
"""Flusk purge command — delete old analysis data."""

from __future__ import annotations

import click

from flusk.analysis.report import purge_sessions


@click.command()
@click.option("--older-than", default=30, help="Delete sessions older than N days")
@click.confirmation_option(prompt="Delete old sessions?")
def purge(older_than: int) -> None:
    """Purge analysis sessions older than N days."""
    count = purge_sessions(older_than_days=older_than)
    click.echo(f"🗑️  Purged {count} session(s).")
# --- END GENERATED ---
`;
}
