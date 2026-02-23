#!/bin/bash
# flusk doctor — Project health check for AI agents and humans
# Run: bash scripts/doctor.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo -e "${BOLD}🩺 Flusk Doctor${NC}"
echo "=============================="
echo ""

# 1. Package sizes
echo -e "${CYAN}📦 Package Health${NC}"
total_files=0
total_lines=0
for pkg in packages/*/; do
  name=$(basename "$pkg")
  [ -d "$pkg/src" ] || continue
  files=$(find "$pkg/src" -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' 2>/dev/null | wc -l | tr -d ' ')
  lines=$(find "$pkg/src" -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
  tests=$(find "$pkg/src" -name '*.test.ts' -o -path '*__tests__/*.ts' 2>/dev/null | wc -l | tr -d ' ')
  total_files=$((total_files + files))
  total_lines=$((total_lines + lines))
  
  status="${GREEN}✓${NC}"
  [ "$lines" -gt 10000 ] && status="${YELLOW}⚠${NC}"
  [ "$lines" -gt 15000 ] && status="${RED}✗${NC}"
  
  printf "  %b %-20s %4s files  %6s lines  %3s tests\n" "$status" "$name" "$files" "$lines" "$tests"
done
echo -e "  ${BOLD}Total: $total_files files, $total_lines lines${NC}"
echo ""

# 2. Dependency graph health
echo -e "${CYAN}🔗 Dependency Graph${NC}"
circular=0
for pkg in packages/*/; do
  name=$(basename "$pkg")
  deps=$(node -e "try{const p=require('./${pkg}package.json');const d=p.dependencies||{};const f=Object.keys(d).filter(k=>k.startsWith('@flusk/'));f.forEach(dep=>{const depName=dep.replace('@flusk/','');const depPkg='./packages/'+depName+'/package.json';try{const dp=require(depPkg);const dd=dp.dependencies||{};if(dd['@flusk/'+name]){console.log('  CIRCULAR: @flusk/'+name+' ↔ @flusk/'+depName)}}catch{}})}catch{}" 2>/dev/null)
  if [ -n "$deps" ]; then
    echo -e "  ${RED}$deps${NC}"
    circular=1
  fi
done
[ "$circular" -eq 0 ] && echo -e "  ${GREEN}✓ No circular dependencies${NC}"
echo ""

# 3. Files over 100 lines
echo -e "${CYAN}📏 Files Over 100 Lines (non-generated)${NC}"
over100=0
for f in $(find packages/*/src -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' ! -path '*dist*' 2>/dev/null); do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 100 ]; then
    # Check if generated
    if head -5 "$f" | grep -q "@generated"; then
      continue  # Skip generated files
    fi
    over100=$((over100 + 1))
    echo -e "  ${YELLOW}⚠ $f ($lines lines)${NC}"
  fi
done
[ "$over100" -eq 0 ] && echo -e "  ${GREEN}✓ All hand-written files under 100 lines${NC}"
echo ""

# 4. Generated file staleness
echo -e "${CYAN}🔄 Generated File Status${NC}"
if [ -f scripts/entity-regen-check.sh ]; then
  stale=$(bash scripts/entity-regen-check.sh 2>/dev/null | grep "STALE" | wc -l | tr -d ' ')
  echo -e "  Stale generated files: ${stale:-0}"
else
  echo -e "  ${YELLOW}⚠ No regen-check script found${NC}"
fi
echo ""

# 5. Test coverage summary
echo -e "${CYAN}🧪 Test Coverage${NC}"
test_files=$(find packages/*/src -name '*.test.ts' -o -path '*__tests__/*.ts' 2>/dev/null | wc -l | tr -d ' ')
src_files=$(find packages/*/src -name '*.ts' ! -name '*.test.ts' ! -path '*__tests__*' ! -name 'index.ts' ! -name '*.d.ts' 2>/dev/null | wc -l | tr -d ' ')
echo "  Test files: $test_files"
echo "  Source files: $src_files"
echo "  Ratio: $(echo "scale=0; $test_files * 100 / $src_files" | bc)%"
echo ""

# 6. YAML entity count vs generated
echo -e "${CYAN}📋 Entity YAMLs${NC}"
yaml_count=$(find packages/schema/entities -name '*.yaml' 2>/dev/null | wc -l | tr -d ' ')
echo "  Entity YAMLs: $yaml_count"
echo ""

# 7. Quick recommendations
echo -e "${BOLD}💡 Recommendations for AI Agents${NC}"
echo "  To add a new entity:    flusk recipe full-entity --from packages/schema/entities/<name>.entity.yaml"
echo "  To add business logic:  Edit CUSTOM sections in packages/business-logic/src/<domain>/"
echo "  To add a CLI command:   flusk recipe cli-command --name <name>"
echo "  To add a pipeline:      Create packages/schema/pipelines/<name>.pipeline.yaml"
echo "  To regenerate:          flusk regenerate"
echo "  To validate:            flusk validate-generated --strict"
echo "  To check ratio:         flusk ratio"
echo ""
echo "  📖 Full guide: CLAUDE.md + docs/generators/for-ai-agents.md"
