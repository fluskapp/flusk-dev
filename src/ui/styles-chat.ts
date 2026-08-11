/**
 * The chat tool window on the right: picker, transcript, composer. The only
 * thing that animates is a reply that is still streaming.
 */
export const CHAT_CSS = `
#chat {
	grid-area: chat; min-width: 0; min-height: 0; display: flex; flex-direction: column;
	background: var(--panel); border-left: 1px solid var(--border);
}
.chat-head { position: static; }
.chat-head span { margin-right: auto; }
#chat-backend {
	font: 11.5px var(--font-ui); color: var(--text); background: var(--bg);
	border: 1px solid var(--border); border-radius: 4px; padding: 1px 4px; max-width: 170px;
}
#chat-hide { padding: 0 6px; font-size: 11px; }

#chat-log { flex: 1; overflow-y: auto; padding: 4px 10px 10px; min-height: 0; }
.bubble { margin: 8px 0; font-size: 12.5px; }
.bubble .who {
	font: 700 10px var(--font-ui); text-transform: uppercase; letter-spacing: .5px;
	color: var(--tag-ah); margin-bottom: 2px;
}
.bubble.user .who { color: var(--tag-user); }
.bubble .text { white-space: pre-wrap; overflow-wrap: break-word; }
.bubble.user .text {
	background: var(--bg); border: 1px solid var(--border);
	border-left: 2px solid var(--tag-user); border-radius: 5px; padding: 5px 8px;
}
.bubble.err .text { color: var(--err); }
.streaming::after {
	content: "▍"; color: var(--accent); animation: ah-caret 1s steps(2) infinite;
}
@keyframes ah-caret { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .streaming::after { animation: none; } }

#chat-cwd {
	padding: 3px 10px; font-family: var(--font-code); font-size: 10.5px;
	border-top: 1px solid var(--border); white-space: nowrap; overflow: hidden;
	text-overflow: ellipsis;
}
#chat-compose { padding: 6px 10px 8px; border-top: 1px solid var(--border); }
#chat-input {
	width: 100%; resize: vertical; font: 12.5px var(--font-ui); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
	padding: 5px 7px; outline: none;
}
#chat-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
.chat-actions { display: flex; align-items: center; gap: 6px; margin-top: 5px; }
.chat-actions .dim { margin-left: auto; text-align: right; }
`;
