# --- BEGIN GENERATED ---
"""Flusk CLI — LLM cost optimization."""

import click

from flusk.cli.analyze import analyze
from flusk.cli.report import report
from flusk.cli.history import history
from flusk.cli.purge import purge


@click.group()
@click.version_option(package_name="flusk")
def cli() -> None:
    """Flusk — LLM cost optimization."""


cli.add_command(analyze)
cli.add_command(report)
cli.add_command(history)
cli.add_command(purge)

if __name__ == "__main__":
    cli()
# --- END GENERATED ---
