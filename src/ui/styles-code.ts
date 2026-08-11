/**
 * The code viewer: a structure strip, a fixed-width line gutter, and the
 * source beside it — IntelliJ's editor, at IntelliJ's density.
 *
 * Two rules keep the gutter honest. The source never SOFT-WRAPS (`white-space:
 * pre`, the view scrolls sideways), because a wrapped line makes row N of the
 * gutter stop meaning line N of the file. And the line height is stated ONCE,
 * as `--code-line`, shared by the gutter rows and the code body; the marked
 * line's band is positioned from a gutter row's measured offset rather than
 * from a second copy of that number.
 */
export const CODE_CSS = `
.code-wrap {
	display: flex; min-height: 0; flex: 1; --code-line: 18px;
	border-top: 1px solid var(--border);
}
/* Structure view: a strip, not a panel — it must not out-weigh the source. */
.code-outline {
	flex: none; width: 200px; min-width: 0; overflow: auto; /* design-exempt: structure pane measure */
	background: var(--panel); border-right: 1px solid var(--border);
}
.co-head {
	position: sticky; top: 0; background: var(--panel); padding: var(--ij-space-1) var(--ij-space-2);
	font-size: var(--ij-fs-3); text-transform: uppercase; letter-spacing: .5px; color: var(--dim);
	border-bottom: 1px solid var(--border);
}
.co-row {
	display: flex; align-items: center; gap: var(--ij-space-2); height: var(--row); cursor: pointer;
	padding-right: var(--ij-space-2); font-size: var(--ij-fs-6); white-space: nowrap;
	overflow: hidden; text-overflow: ellipsis; border-left: 2px solid transparent;
}
.co-row:hover { background: var(--hover); }
.co-row.on { background: var(--sel); border-left-color: var(--accent); }
.co-empty { padding: var(--ij-space-2); color: var(--dim); font-size: var(--ij-fs-4); }
/* Why part of a file is not clickable — said, rather than left to be noticed. */
.code-note {
	padding: var(--ij-space) var(--ij-space-3); font-size: var(--ij-fs-4); color: var(--dim);
	background: var(--panel); border-bottom: 1px solid var(--border);
}

.code-view {
	flex: 1; min-width: 0; display: flex; overflow: auto; position: relative;
	background: var(--bg);
}
/* Sticky, so the numbers stay put while the source scrolls sideways. */
.code-gutter {
	position: sticky; left: 0; z-index: 1; flex: none; min-width: 46px; /* design-exempt: gutter measure */
	background: var(--gutter-bg); border-right: 1px solid var(--border);
	padding: var(--ij-space-2) var(--ij-space-2) calc(var(--ij-space-4) * 4) 0; text-align: right; user-select: none;
}
.code-gutter .gl {
	height: var(--code-line); line-height: var(--code-line);
	font: var(--ij-fs-4) var(--font-code); color: var(--dim);
}
.code-gutter .gl.on { color: var(--accent); background: var(--accent-soft); }

.code-body { position: relative; flex: 1; min-width: 0; padding: var(--ij-space-2) 0 calc(var(--ij-space-4) * 4) var(--ij-space-3); }
.code-body pre.code, .code-body pre {
	margin: 0; padding: 0; border: 0; background: none;
	white-space: pre; font: var(--ij-fs-5)/var(--code-line) var(--font-code);
}
.code-body code { background: none; padding: 0; }
/* Where a jump landed: a band the width of the view, behind the text. */
.code-mark {
	position: absolute; left: 0; right: 0; height: var(--code-line);
	background: var(--sel); pointer-events: none;
}
/* Identifiers are click targets, and look like it only under the pointer —
   a page where every word is underlined reads as a page of links. */
.idn { cursor: pointer; border-bottom: 1px solid transparent; }
.idn:hover { border-bottom-color: var(--accent); }
.idn.on { background: var(--match-bg); color: var(--match-fg); }
`;
