# --- BEGIN GENERATED ---
"""Flusk analyze command — run a script with OTel instrumentation."""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import click

from flusk.otel.setup import configure_otel, shutdown_otel
from flusk.analysis.report import format_report


@click.command()
@click.argument("script", type=click.Path(exists=True))
@click.option("-d", "--duration", default=0, help="Max duration in seconds (0=until exit)")
@click.option("-o", "--output", "output_file", default=None, help="Write report to file")
@click.option("-f", "--format", "fmt", default="markdown", type=click.Choice(["markdown", "json"]))
@click.option("--redact/--no-redact", default=True, help="Redact sensitive data")
def analyze(script: str, duration: int, output_file: str | None, fmt: str, redact: bool) -> None:
    """Analyze LLM costs for a Python script."""
    session_id = configure_otel(redact=redact)
    click.echo(f"🔍 Analyzing {script} (session: {session_id[:8]}...)")
    try:
        cmd = [sys.executable, str(Path(script).resolve())]
        proc = subprocess.run(cmd, timeout=duration or None, check=False)
    except subprocess.TimeoutExpired:
        click.echo("⏱️  Duration limit reached.")
    finally:
        shutdown_otel()
    report_text = format_report(session_id, fmt=fmt)
    click.echo(report_text)
    if output_file:
        Path(output_file).write_text(report_text, encoding="utf-8")
        click.echo(f"📄 Report saved to {output_file}")
# --- END GENERATED ---
