# UI parity checklist — the gate before the one-cut deletion

The legacy `src/ui/client-*.ts` / `styles-*.ts` implementation stays in the
tree, unshipped, until every box is ticked; then it is deleted in one commit.

## Tool windows (ported, verified by gates + SSR smoke)
- [x] 1 Projects — tree order, worktree grouping, search, j/k cursor
- [x] 2 Runs — pills, cost sort, journal chips, deferred transcript
- [x] 3 Docs — Preview/Split/Raw (p/s/R), frontmatter, reading measure
- [x] 4 Find — debounced ripgrep, grouped rows, keyboard nav
- [x] 5 Chat — streaming, allowedCwds, abort-on-disconnect, liveChats reuse
- [x] 6 Documentation — LSP off the SSR path, flusk:symbol listener
- [x] 7 Flows — stage chips, shape line, step outputs
- [x] 8 Graph — SVG star, why-cell budget, build-from-empty
- [x] 9 Web — untrusted pill, cache refresh, reading list
- [x] 0 Ask — context card, snapshot semantics, ⌘Enter
- [x] Palette / Go to File / help sheet
- [x] Code viewer — highlight, outline, ?line, peek

## Open items (what the one cut still waits on)
- [x] Toolbar `#count` — served from the root loader (projects · live).
- [ ] Global toast node — currently per-component; decide whether the chrome
      owns one.
- [ ] Tree/view cursor zones (Tab switching between tree and table).
- [x] Per-route SSR content assertions in CI (test/app-ssr.test.ts, against
      the built handler; skips honestly when dist-app is absent).
- [ ] Browser-level hydration interactions (digits, palette, chat send) —
      Playwright, still open.
- [ ] Visual pass against the legacy page for spacing/typography drift.

## After the cut
- Legacy `page.ts`/`server.ts` routing chain deleted; `flusk ui --server`
  serves the React app via the same handler Electron mounts.
- `PAGE_HEADERS`' `unsafe-inline` allowances drop (Vite emits real files).
