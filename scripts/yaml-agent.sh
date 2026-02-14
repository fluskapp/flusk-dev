#!/bin/bash
# yaml-agent.sh — Wrapper for AI sub-agents
# Ensures agents ONLY modify YAML files, then runs generators automatically
#
# Usage: ./scripts/yaml-agent.sh <action> [args]
#
# Actions:
#   create <entity-name>  — creates empty YAML template in entities/
#   generate <yaml-path>  — runs full-entity recipe from YAML
#   regenerate            — regenerates all stale entities
#   validate              — checks all generated files match YAMLs
#   diff <yaml-path>      — shows what would change without writing

set -euo pipefail

ENTITIES_DIR="entities"
RECIPE_RUNNER="run-recipe.mjs"

case "${1:-help}" in
  create)
    NAME="${2:?Usage: yaml-agent.sh create <entity-name>}"
    YAML_PATH="$ENTITIES_DIR/$NAME.entity.yaml"
    if [ -f "$YAML_PATH" ]; then
      echo "ERROR: $YAML_PATH already exists"
      exit 1
    fi
    cat > "$YAML_PATH" << 'EOF'
name: REPLACE_ME
description: REPLACE_ME
storage: [sqlite]

fields:
  exampleField:
    type: string
    required: true
    description: REPLACE_ME

capabilities:
  crud: true
EOF
    echo "Created $YAML_PATH — edit the YAML, then run: ./scripts/yaml-agent.sh generate $YAML_PATH"
    ;;

  generate)
    YAML="${2:?Usage: yaml-agent.sh generate <yaml-path>}"
    if [ ! -f "$YAML" ]; then
      echo "ERROR: $YAML not found"
      exit 1
    fi
    echo "Generating from $YAML..."
    node "$RECIPE_RUNNER" "$YAML"
    echo "Done. Run 'pnpm test' to verify."
    ;;

  regenerate)
    echo "Regenerating all stale entities..."
    pnpm exec tsx packages/cli/bin/flusk.ts regenerate
    ;;

  validate)
    echo "Validating generated files..."
    pnpm exec tsx packages/cli/bin/flusk.ts validate-generated --strict
    ;;

  diff)
    YAML="${2:?Usage: yaml-agent.sh diff <yaml-path>}"
    echo "Dry-run generation from $YAML..."
    pnpm exec tsx packages/cli/bin/flusk.ts recipe full-entity --from "$YAML" --dry-run
    ;;

  help|*)
    echo "yaml-agent.sh — AI sub-agent wrapper"
    echo ""
    echo "Actions:"
    echo "  create <name>     Create empty YAML template"
    echo "  generate <yaml>   Generate code from YAML"
    echo "  regenerate        Regenerate all stale entities"
    echo "  validate          Check generated files are up to date"
    echo "  diff <yaml>       Preview changes without writing"
    ;;
esac
