#!/bin/bash
# flusk scope <domain> — Generate a focused brief for AI agents
# Shows only what's relevant to a specific domain/package
# Usage: bash scripts/scope.sh business-logic budget
#        bash scripts/scope.sh entity llm-call
#        bash scripts/scope.sh pipeline latency-analysis
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCOPE="${1:-help}"
TARGET="${2:-}"

if [ "$SCOPE" = "help" ] || [ -z "$TARGET" ]; then
  echo "Usage: bash scripts/scope.sh <scope> <target>"
  echo ""
  echo "Scopes:"
  echo "  entity <name>       — YAML + all generated files for an entity"
  echo "  domain <name>       — Business logic domain (budget, routing, etc.)"
  echo "  pipeline <name>     — Pipeline YAML + generated code"
  echo "  package <name>      — Package overview + all exports"
  echo "  feature <name>      — Cross-package search for a feature"
  echo ""
  echo "Examples:"
  echo "  bash scripts/scope.sh entity llm-call"
  echo "  bash scripts/scope.sh domain budget"
  echo "  bash scripts/scope.sh pipeline latency-analysis"
  echo "  bash scripts/scope.sh package otel"
  exit 0
fi

case "$SCOPE" in
  entity)
    echo "=== Entity: $TARGET ==="
    echo ""
    
    # YAML source
    yaml=$(find packages/schema/entities -name "*${TARGET}*" 2>/dev/null | head -1)
    if [ -n "$yaml" ]; then
      echo "📋 YAML Source: $yaml"
      echo "---"
      cat "$yaml"
      echo "---"
    fi
    echo ""
    
    # Generated files
    echo "📁 Generated Files:"
    find packages/*/src -name "*${TARGET}*" ! -name '*.test.*' ! -path '*__tests__*' 2>/dev/null | sort
    echo ""
    
    # Tests
    echo "🧪 Tests:"
    find packages/*/src -path "*${TARGET}*" -name '*.test.*' 2>/dev/null
    find packages/*/src -path "*${TARGET}*/__tests__/*" 2>/dev/null
    echo ""
    
    # Custom sections
    echo "✏️ Custom Code Sections:"
    for f in $(find packages/*/src -name "*${TARGET}*" ! -name '*.test.*' ! -path '*__tests__*' 2>/dev/null); do
      custom=$(sed -n '/BEGIN CUSTOM/,/END CUSTOM/p' "$f" 2>/dev/null | grep -v "BEGIN CUSTOM\|END CUSTOM" | grep -v "^$" | wc -l | tr -d ' ')
      [ "$custom" -gt 0 ] && echo "  $f: $custom lines of custom code"
    done
    ;;
    
  domain)
    echo "=== Business Logic Domain: $TARGET ==="
    dir="packages/business-logic/src/$TARGET"
    if [ ! -d "$dir" ]; then
      echo "Domain '$TARGET' not found. Available:"
      ls -d packages/business-logic/src/*/  2>/dev/null | xargs -I{} basename {}
      exit 1
    fi
    echo ""
    
    # Index exports
    echo "📤 Exports (index.ts):"
    cat "$dir/index.ts" 2>/dev/null
    echo ""
    
    # All functions with signatures
    echo "📝 Functions:"
    for f in "$dir"/*.function.ts; do
      [ -f "$f" ] || continue
      echo "  $(basename "$f"):"
      grep -E "^export (async )?function" "$f" | sed 's/^/    /'
    done
    echo ""
    
    # Types
    echo "📐 Types:"
    for f in "$dir"/*.types.ts; do
      [ -f "$f" ] || continue
      echo "  $(basename "$f"):"
      grep -E "^export (interface|type)" "$f" | sed 's/^/    /'
    done
    echo ""
    
    # Tests
    echo "🧪 Tests:"
    find "$dir" -name '*.test.ts' -o -path '*__tests__*' 2>/dev/null
    echo ""
    
    # External usage
    echo "🔗 Used by (outside business-logic):"
    grep -rl "from.*business-logic.*$TARGET\|$TARGET\." packages/execution/src packages/cli/src packages/otel/src packages/resources/src 2>/dev/null | grep -v '.test.' | grep -v '__tests__' || echo "  (none)"
    ;;
    
  pipeline)
    echo "=== Pipeline: $TARGET ==="
    yaml=$(find packages/schema/pipelines -name "*${TARGET}*" 2>/dev/null | head -1)
    if [ -n "$yaml" ]; then
      echo "📋 YAML: $yaml"
      echo "---"
      cat "$yaml"
      echo "---"
    fi
    echo ""
    echo "📁 Generated Files:"
    find packages/*/src -path "*analytics*" -name "*${TARGET}*" 2>/dev/null
    ;;
    
  package)
    echo "=== Package: $TARGET ==="
    pkg="packages/$TARGET"
    if [ ! -d "$pkg" ]; then
      echo "Package not found. Available:"
      ls packages/
      exit 1
    fi
    echo ""
    
    # Description
    echo "📖 $(node -e "const p=require('./$pkg/package.json');console.log(p.description||'No description')" 2>/dev/null)"
    echo ""
    
    # Stats
    files=$(find "$pkg/src" -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' 2>/dev/null | wc -l | tr -d ' ')
    lines=$(find "$pkg/src" -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
    tests=$(find "$pkg/src" -name '*.test.ts' -o -path '*__tests__/*.ts' 2>/dev/null | wc -l | tr -d ' ')
    echo "📊 Stats: $files files, $lines lines, $tests tests"
    echo ""
    
    # Internal deps
    echo "🔗 Dependencies:"
    node -e "const p=require('./$pkg/package.json');Object.keys(p.dependencies||{}).filter(k=>k.startsWith('@flusk/')).forEach(k=>console.log('  '+k))" 2>/dev/null
    echo ""
    
    # Directory structure
    echo "📁 Structure:"
    find "$pkg/src" -type d ! -path '*__tests__*' ! -path '*dist*' 2>/dev/null | sed "s|$pkg/src|  src|" | sort
    echo ""
    
    # Public API (index.ts)
    echo "📤 Public API (index.ts):"
    cat "$pkg/src/index.ts" 2>/dev/null
    ;;
    
  feature)
    echo "=== Feature Search: $TARGET ==="
    echo ""
    echo "📁 All files matching '$TARGET':"
    find packages/*/src -name "*${TARGET}*" 2>/dev/null | sort
    echo ""
    echo "📝 All references to '$TARGET' in source:"
    grep -rl "$TARGET" packages/*/src 2>/dev/null | grep -v node_modules | grep -v dist | sort
    ;;
    
  *)
    echo "Unknown scope: $SCOPE"
    echo "Run: bash scripts/scope.sh help"
    exit 1
    ;;
esac
