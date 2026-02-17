# --- BEGIN GENERATED ---
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
