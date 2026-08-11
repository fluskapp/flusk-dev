/**
 * The chat tool window on the right: transcript, composer, drag handle.
 *
 * Quiet by default — no role labels, no bubbles around the model's words, one
 * hairline between exchanges. The only things that move are the streaming
 * caret and a timestamp that fades in when the pointer is over a turn.
 */
export const CHAT_CSS = `
#chat {
	grid-area: chat; position: relative; min-width: 0; min-height: 0;
	display: flex; flex-direction: column;
	background: var(--panel); border-left: 1px solid var(--border);
}
/* Splitter geometry lives with the frame it splits — see styles-chrome.ts. */
/* The picker sits at the right of the header, whatever labels precede it. */
.chat-head { position: static; }
.chat-head #chat-backend { margin-left: auto; }
#chat-hide { margin-left: auto; padding: 0 6px; font-size: 11px; }

#chat-log {
	flex: 1; min-height: 0; overflow-y: auto; padding: 2px 12px 16px; font-size: 12.5px;
}
.turn { position: relative; margin: 9px 0; }
/* One thin separator per exchange: the user's turn opens the next one. */
.turn.user {
	display: flex; justify-content: flex-end;
	border-top: 1px solid var(--border); padding-top: 12px;
}
#chat-log > .turn.user:first-child { border-top: none; padding-top: 2px; }
/* A tinted block, not a chat bubble: the workbench has two radii — 0 for
   containers and fields, 3px for buttons — and an iMessage tail is neither. */
.turn.user .said {
	max-width: 85%; padding: 5px 9px;
	background: var(--accent-soft); white-space: pre-wrap; overflow-wrap: break-word;
}
.turn.model .body { overflow-wrap: break-word; }
.turn time {
	position: absolute; top: -4px; right: 0; pointer-events: none;
	font: 10px var(--font-code); color: var(--dim);
	opacity: 0; transition: opacity .12s;
}
.turn:hover time { opacity: .8; }
/* Rendered markdown reuses the reader's rules (styles-docs) but sits flush. */
.turn .md > :first-child { margin-top: 0; }
.turn .md > :last-child { margin-bottom: 0; }
.turn .md table { font-size: 12px; }
.turn .md h1, .turn .md h2, .turn .md h3 { font-size: 13.5px; margin: 12px 0 5px; }
.turn-err {
	margin: 4px 0 10px; padding-left: 8px; font-size: 11.5px; color: var(--dim);
	border-left: 2px solid var(--err);
}
.streaming::after {
	content: "▍"; color: var(--accent); animation: ah-caret 1s steps(2) infinite;
}
@keyframes ah-caret { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .streaming::after { animation: none; } }

#chat-compose { padding: 7px 12px 9px; border-top: 1px solid var(--border); }
#chat-input {
	display: block; width: 100%; height: 46px; max-height: 132px; resize: none;
	font: 12.5px/1.5 var(--font-ui); color: var(--text); background: var(--bg);
	border: 1px solid var(--border); border-radius: 0; padding: 6px 8px; outline: none;
}
/* The same focus treatment as #search, #doc-search and #find-form input:
   the border changes colour. No glow ring; nothing else in the app has one. */
#chat-input:focus { border-color: var(--accent); }
/* One row: backend, cwd, Send. Stop takes Send's place while streaming. */
.chat-actions { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
#chat-backend {
	flex: none; max-width: 118px; font: 11px var(--font-ui); color: var(--dim);
	background: var(--bg); border: 1px solid var(--border); border-radius: 0;
	padding: 1px 3px;
}
#chat-cwd {
	flex: 1; min-width: 0; padding: 0; border: none; text-align: right;
	font: 10.5px var(--font-code); color: var(--dim);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#chat-send, #chat-stop { flex: none; }
#chat-note { flex: none; font-size: 11px; }
#chat-note:empty { display: none; }
`;
