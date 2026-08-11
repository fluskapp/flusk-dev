/**
 * Static markup for the chrome that is pure HTML: the chat tool window, the
 * Find in Files tool window, and the shortcut sheet. Kept out of page.ts so
 * the page file stays a shell, and out of the client-*.js strings because
 * nothing here is generated — it never touches user data.
 */

/** The shortcut sheet lives beside its rows; re-exported so page.ts has one import. */
export { HELP_HTML } from "./client-help.js";

/** Right tool window (6): backend picker, transcript, composer. */
export const CHAT_HTML = `<aside id="chat">
	<div class="tw-head chat-head">
		<span class="tw-num">5</span><span>Chat</span>
		<select id="chat-backend" title="Backend"><option>loading…</option></select>
		<button id="chat-hide" title="Hide chat (&#8984;6)">&#10005;</button>
	</div>
	<div id="chat-log"><div class="empty small">Ask the model about the selected project.</div></div>
	<div id="chat-cwd" class="dim small">cwd: no project selected</div>
	<div id="chat-compose">
		<textarea id="chat-input" rows="3" placeholder="Message (Enter sends, Shift+Enter newline)"
			spellcheck="false"></textarea>
		<div class="chat-actions">
			<button id="chat-send" class="act">Send</button>
			<button id="chat-stop" class="act" hidden>Stop</button>
			<span id="chat-note" class="dim small"></span>
		</div>
	</div>
</aside>`;

/**
 * Bottom tool window (5): the query line, then a result tree. Every control
 * is a real form field so the browser's own focus order is the tab order.
 */
export const FIND_HTML = `<section id="find">
	<div class="tw-head">
		<span class="tw-num">4</span><span class="glyph">find</span><span>Find in Files</span>
		<span class="spacer"></span>
		<button id="find-hide" title="Hide Find (&#8984;4)">&#10005;</button>
	</div>
	<div id="find-form">
		<input id="find-q" spellcheck="false" placeholder="Search across your projects (ripgrep)"/>
		<select id="find-scope" title="Where to search">
			<option value="project">This project</option>
			<option value="all">All projects</option>
		</select>
		<input id="find-mask" spellcheck="false" placeholder="File mask *.ts" title="ripgrep glob"/>
		<label class="find-toggle" title="Match case"><input type="checkbox" id="find-case"/>Match case</label>
		<label class="find-toggle" title="Regular expression"><input type="checkbox" id="find-regex"/>Regex</label>
		<span id="find-note"></span>
	</div>
	<div id="find-results"><div class="fx-empty">Type to search every configured project.</div></div>
</section>`;
