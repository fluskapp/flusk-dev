/** @generated —
 * Gitignore IDE, OS, and project-specific sections
 */

/**
 * IDE, OS, temp files, and project-specific ignore patterns
 */
export function getIdeOsAndProjectPatterns(): string {
  return `
# ============================================
# IDEs & Editors
# ============================================
# VS Code
.vscode/
!.vscode/extensions.json
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
*.code-workspace

# JetBrains IDEs
.idea/
*.iml
*.ipr
*.iws

# Sublime Text
*.sublime-project
*.sublime-workspace

# Vim
*.swp
*.swo
*~

# Emacs
*~
\\#*\\#
.\\#*

# ============================================
# OS Files
# ============================================
# macOS
.DS_Store
.AppleDouble
.LSOverride
._*
.Spotlight-V100
.Trashes

# Windows
Thumbs.db
ehthumbs.db
Desktop.ini
$RECYCLE.BIN/

# Linux
*~
.directory
.Trash-*/

# ============================================
# Temporary Files
# ============================================
tmp/
temp/
*.tmp
*.temp
.cache/
.parcel-cache/

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
