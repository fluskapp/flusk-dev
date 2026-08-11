/**
 * Static markup for the chrome that is pure HTML: the chat tool window, the
 * Find in Files tool window, and the shortcut sheet. Kept out of page.ts so
 * the page file stays a shell, and out of the client-*.js strings because
 * nothing here is generated — it never touches user data.
 */

/** The shortcut sheet lives beside its rows; re-exported so page.ts has one import. */
export { HELP_HTML } from "./client-help.js";

/**
 * Right tool window (6): backend picker, transcript, composer. The composer
 * arrives assembled — the picker is a header action and the cwd note is the
 * first cell of the button row — so nothing has to be moved at boot.
 *
 * `tabindex="-1"` on the log is a click-only focus stop: the transcript can
 * hold focus (so its selection reads as the focused one) without taking a
 * place in the tab order, which still runs textarea → Send.
 */
export const CHAT_HTML = `<aside id="chat">
	<div class="tw-head chat-head">
		<span class="tw-num">6</span><span>Chat</span>
		<select id="chat-backend" title="Backend"><option>loading…</option></select>
		<button id="chat-hide" title="Hide chat (&#8984;6)">&#10005;</button>
	</div>
	<div id="chat-log" tabindex="-1"><div class="empty small">Ask the model about the selected project.</div></div>
	<div id="chat-compose">
		<textarea id="chat-input" rows="2" placeholder="Message (Enter sends, Shift+Enter newline)"
			spellcheck="false"></textarea>
		<div class="chat-actions">
			<span id="chat-cwd" title="Working directory">cwd: no project selected</span>
			<span id="chat-note"></span>
			<button id="chat-stop" hidden>Stop</button>
			<button id="chat-send">Send</button>
		</div>
	</div>
</aside>`;

/**
 * Bottom tool window (5): the query line, then a result tree. Every control
 * is a real form field so the browser's own focus order is the tab order —
 * including the case and regex toggles, which IntelliJ draws as filled
 * SearchOption buttons rather than as checkboxes. The checkbox is still
 * there, zero-sized, with the label text moved into a span the CSS can fill.
 *
 * The result tree is never focused — the query field keeps the keyboard and
 * the arrows move the tree's cursor from there — so the selection is announced
 * the way that pattern requires: aria-controls here, and aria-activedescendant
 * pointing at the current row's id, which syncFindCursor keeps in step.
 */
export const FIND_HTML = `<section id="find">
	<div class="tw-head">
		<span class="tw-num">5</span><span class="glyph">find</span><span>Find in Files</span>
		<span class="spacer"></span>
		<button id="find-hide" title="Hide Find (&#8984;5)">&#10005;</button>
	</div>
	<div id="find-form">
		<input id="find-q" spellcheck="false" placeholder="Search across your projects (ripgrep)"
			aria-controls="find-results"/>
		<select id="find-scope" title="Where to search">
			<option value="project">This project</option>
			<option value="all">All projects</option>
		</select>
		<input id="find-mask" spellcheck="false" placeholder="File mask *.ts" title="ripgrep glob"/>
		<label class="find-toggle" title="Match case"><input type="checkbox" id="find-case"/><span>Match case</span></label>
		<label class="find-toggle" title="Regular expression"><input type="checkbox" id="find-regex"/><span>Regex</span></label>
		<span id="find-note"></span>
	</div>
	<div id="find-results" role="tree" aria-label="Find results">
		<div class="fx-empty" role="presentation">Type to search every configured project.</div>
	</div>
</section>`;
