/**
 * The shortcut sheet, rendered. The rows themselves live in
 * client-help-groups.ts — this file only turns them into the overlay.
 */
import { HELP_GROUPS } from "./client-help-groups.js";

export type HelpRow = [string, string];
export type HelpGroup = { id: string; title: string; rows: HelpRow[] };


function groupHtml(g: HelpGroup): string {
	const rows = g.rows.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join("");
	return `<div class="help-group" id="${g.id}"><h4>${g.title}</h4><div class="keys">${rows}</div></div>`;
}

/**
 * The shortcut sheet, pre-rendered: every row is a literal, never user data.
 * Shaped like an IntelliJ popup — a header strip over one scrolling body — so
 * the title stays put while a long sheet scrolls under it.
 */
export const HELP_HTML = `<div id="help" class="overlay" hidden>
	<div class="help-card">
		<div class="popup-head"><h3>Shortcuts</h3><span class="spacer"></span>
			<span class="dim small">Esc or click to close</span></div>
		<div class="help-body">
			<div class="help-groups">${HELP_GROUPS.map(groupHtml).join("")}</div>
		</div>
	</div>
</div>`;
