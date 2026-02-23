#!/bin/bash
# Entity regeneration pre-flight check
# Shows what will change when regenerating from YAML

set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ENTITY=${1:-llm-call}

echo "🔍 Checking entity: $ENTITY"
echo ""

YAML="$ROOT/packages/schema/entities/$ENTITY.entity.yaml"
if [ ! -f "$YAML" ]; then
  echo "❌ YAML not found: $YAML"
  exit 1
fi

# Show fields in YAML
echo "📋 YAML fields:"
grep "^  [a-zA-Z]" "$YAML" | grep -v "type:\|required:\|description:\|min:\|max:\|default:\|index:\|values:\|enum:" | sed 's/://' | while read field; do
  echo "  - $field"
done
echo ""

# Show what's in current generated entity
ENTITY_FILE="$ROOT/packages/entities/src/$ENTITY.entity.ts"
if [ -f "$ENTITY_FILE" ]; then
  echo "📦 Current entity fields:"
  grep -E "^\s+(Type\.|[a-zA-Z]+:)" "$ENTITY_FILE" | head -30
  echo ""
fi

# Show current SQL columns
SQL_FILE="$ROOT/packages/resources/src/sqlite/sql/$ENTITY.sql"
if [ -f "$SQL_FILE" ]; then
  echo "🗄️ Current SQL columns:"
  grep -E "^\s+\w+ (TEXT|INTEGER|REAL|BLOB)" "$SQL_FILE"
  echo ""
fi

# Show hash comparison
CURRENT_HASH=$(grep "Hash:" "$ENTITY_FILE" 2>/dev/null | head -1 | awk '{print $NF}')
YAML_HASH=$(sha256sum "$YAML" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$YAML" | cut -d' ' -f1)
echo "🔐 Hash: current=$CURRENT_HASH"
echo "         yaml=$YAML_HASH"
if [ "$CURRENT_HASH" = "$YAML_HASH" ]; then
  echo "  ✅ Up to date"
else
  echo "  ⚠️  STALE — regeneration needed"
fi

# Check for test fixtures that might need updating
echo ""
echo "🧪 Test fixtures using this entity:"
grep -rln "LLMCallEntity\|makeCall\|createCall" "$ROOT/packages/" --include="*.test.ts" 2>/dev/null | while read f; do
  has_status=$(grep -c "status:" "$f" 2>/dev/null || echo 0)
  echo "  $f (has status: $has_status)"
done
