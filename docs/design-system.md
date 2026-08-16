# The flusk design system

The reference is the JetBrains New UI — not as a mood board but as measured
values: every color, metric and type size traces to the theme dumps in
`docs/expUI_*.json` through `src/ui/styles-tokens.ts`, which generates the
`tokens.css` both the app and flusk.dev consume. This document is the layer
above the tokens: how they compose. `src/ui/react/system/` implements it.

## Surfaces — three, and only three

| Surface | Token | Dark value | Carries |
| --- | --- | --- | --- |
| Editor | `--bg` | `#1E1F22` | the content you read: transcripts, docs, code |
| Panel | `--panel` | `#2B2D30` | rails, cards, toolbars, headers, status bar |
| Line | `--border` | `#393B40` | every hairline; there is no other border color |

Depth comes from layering these, never from shadows. A card on the editor is
panel-on-bg with a hairline; an inset code block on a card is bg-on-panel.
If a surface needs a fourth level, the layout is wrong, not the palette.

## Type

Two families (`--font-ui`, `--font-code`), the nine-step `--ij-fs-*` ramp.
Rules: identifiers, paths, branches, ids are ALWAYS code-font, usually in a
chip. Uppercase is reserved for section labels at `fs-2/600/+0.5px` — never
for content. Titles are ONE line, ellipsized (`.sys-ellipsis`), with the full
text in `title=` — a page never renders a paragraph as its heading.

## Icons

16×16 inline SVG, `stroke: currentColor`, 1.5px, rounded joins —
`system/icons.tsx`. Every row of every list leads with a glyph; every tool
call in a transcript leads with what HAPPENED (write→pencil, bash→terminal).
Icons inherit text color and dim with their row: color is state, not
decoration.

## Controls — the 22px vocabulary

- `.sys-btn` — 22px, panel fill, hairline border, radius `--ij-radius-sm`.
  `.icon` for 22×22 glyph buttons (always with `title=`), `.bare` for
  toolbar-embedded ones, `.primary` for the single accent action of a view.
- `.sys-chip` — inline metadata (branch, path, kind). Code-font via `.mono`.
- `.sys-pill` — status: `ok/err/warn/run/dim`, soft 15% fills via
  `color-mix`, uppercase fs-1. One pill per row, leading.
- `.sys-live` — the 6px pulse that means "now"; respects reduced-motion.
- `.sys-card` — panel block with an optional uppercase `.sys-card-head`.

## Interaction constants

- Row heights from `--row`/`--ij-row-h`; selection `--sel` focused,
  inactive-selection color on blur; hover never moves layout (transparent
  borders reserve their pixel).
- Scrollbars are the thin quiet kind, thumb `--border`, hover `--dim`.
- One `:focus-visible` ring, defined once in chrome.css.
- Escape always closes the nearest thing; Enter always acts on the selection;
  typing over a focused list is speed-search.

## Content rules

- Raw JSON never appears collapsed. A tool row shows its path or its command;
  serialization lives inside the expansion.
- Long user/task text folds to its first line plus a line count.
- Every count, cost and duration is right-aligned code-font.
- Empty states name the action that fixes them; loading states are
  density-matched skeletons, not spinners.
