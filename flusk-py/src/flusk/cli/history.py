# --- BEGIN GENERATED ---
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
