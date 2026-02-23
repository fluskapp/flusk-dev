/**
 * Gitignore project-specific patterns (Watt, Flusk, misc).
 */

export function getProjectPatterns(): string {
  return `
# ============================================
# Platformatic Watt
# ============================================
.platformatic/
.watt/

# ============================================
# Flusk Specific
# ============================================
# Generated migrations (keep source migrations)
packages/resources/src/migrations/*.generated.ts

# Generated types (regenerated from entities)
packages/types/src/*.generated.ts

# Local development overrides
watt.local.json
docker-compose.local.yml

# ============================================
# Misc
# ============================================
.turbo/
.vercel/
.next/
.nuxt/
.output/
.vite/
`;
}
