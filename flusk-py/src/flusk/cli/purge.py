# --- BEGIN GENERATED ---
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
