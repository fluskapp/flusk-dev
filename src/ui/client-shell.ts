/**
 * Static markup for the two pieces of chrome that are pure HTML: the chat
 * tool window and the shortcut sheet. Kept out of page.ts so the page file
 * stays a shell, and out of the client-*.js strings because nothing here is
 * generated — it never touches user data.
 */

/** Right tool window: backend picker, transcript, composer. */
export const CHAT_HTML = `<aside id="chat">
	<div class="tw-head chat-head">
		<span>Chat</span>
		<select id="chat-backend" title="Backend"><option>loading…</option></select>
		<button id="chat-hide" title="Hide chat (c)">&#10005;</button>
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

const HELP_ROWS: Array<[string, string]> = [
	["/", "Search projects"],
	["j", "Next row"],
	["k", "Previous row"],
	["Enter", "Open selected row"],
	["Tab", "Cursor: tree ↔ table"],
	["1", "Attention (what needs me)"],
	["2", "Runs"],
	["3", "Docs"],
	["4", "Brain"],
	["o", "Attention"],
	["r", "Runs"],
	["d", "Docs"],
	["b", "Brain"],
	["c", "Focus chat"],
	["w", "Close current tab"],
	["t", "Toggle theme"],
	["Esc", "Clear / close"],
	["?", "This panel"],
];

/** The shortcut sheet, pre-rendered: every row is a literal, never user data. */
export const HELP_HTML = `<div id="help" class="overlay" hidden>
	<div class="help-card"><h3>Shortcuts</h3><div class="keys">${HELP_ROWS.map(
		([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`,
	).join("")}</div></div>
</div>`;
