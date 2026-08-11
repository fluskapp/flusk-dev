/**
 * The editor area's own chrome: the tab strip, at TabbedPane.tabHeight with
 * EditorTabs.underlineHeight under the selected tab — the two metrics the
 * token layer already carries for exactly this surface, rather than the 30 and
 * 2 that used to be typed here. The dense tables the views are built from grew
 * past this file's budget and moved next door to styles-table.ts; WORK_CSS
 * still ships both, in the same cascade position, so nothing else has to know
 * they were split.
 */
import { TABLE_CSS } from "./styles-table.js";

const TABS_CSS = `
#tabs {
	display: flex; align-items: stretch; overflow-x: auto; flex: none;
	height: var(--ij-tab-h);
	background: var(--panel); border-bottom: 1px solid var(--border);
}
#tabs .tab {
	display: flex; align-items: center; gap: var(--ij-space); cursor: pointer;
	padding: 0 var(--ij-space-2); font-size: var(--ij-fs-6); white-space: nowrap;
	border-right: 1px solid var(--border);
	border-bottom: var(--ij-underline-h) solid transparent;
	max-width: 240px; /* design-exempt: the widest a tab label may grow */
}
#tabs .tab:hover { background: var(--hover); }
#tabs .tab.on { background: var(--bg); border-bottom-color: var(--accent); }
#tabs .tab .label { overflow: hidden; text-overflow: ellipsis; }
/* The kind glyph: md / run / session / doc / find, in the gutter font so the
   strip reads as a file list rather than a row of buttons. */
.glyph {
	font: var(--ij-fs-1) var(--font-code); color: var(--dim); text-transform: uppercase;
	border: 1px solid var(--border); padding: 0 var(--ij-space-1); flex: none; letter-spacing: .2px;
}
#tabs .tab.on .glyph { color: var(--accent); border-color: var(--accent); }
/* Close is an affordance on hover (and on the active tab), like IntelliJ. */
#tabs .tab .x { color: var(--dim); font-size: var(--ij-fs-1); visibility: hidden; }
#tabs .tab:hover .x, #tabs .tab.on .x { visibility: visible; }
#tabs .tab .x:hover { color: var(--err); }
`;

export const WORK_CSS = `${TABS_CSS}${TABLE_CSS}`;
