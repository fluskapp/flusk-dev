/**
 * Chat tool window (right dock), in the IntelliJ New UI idiom: a 26px header
 * whose only action is the backend combo, a flat transcript, and a composer
 * built from IntelliJ's own control metrics (TextField/Button minimumSize 28,
 * Component.arc/Button.arc 8). One hairline between exchanges, no shadows.
 *
 * Every colour is a semantic token. Two mappings are worth naming because the
 * token's name does not say them: the user's block is
 * HelpBrowser.UserMessage.background, whose Gray11/Gray4 pair is the same pair
 * the theme uses for *.selectionInactiveBackground (the token layer carries
 * that pair once, as --ij-selection-inactive); and the default button's focus
 * border is Button.default.focusedBorderColor, Gray14/Gray1 — the pair the
 * token layer carries as --ij-text-on-accent — which is NOT that button's TEXT:
 * Button.default.foreground is white in both themes (--ij-button-default-fg).
 */
export const CHAT_CSS = `
#chat {
	grid-area: chat; position: relative; min-width: 0; min-height: 0;
	display: flex; flex-direction: column;
	background: var(--panel); border-left: 1px solid var(--border);
}
/* Splitter geometry lives with the frame it splits — see styles-chrome.ts. */
/* ToolWindow.Header: one band, the backend combo sitting in it as an action. */
#chat .tw-head { height: var(--ij-tw-header-h); padding: 0 var(--ij-space-3); }
.chat-head #chat-backend { margin-left: auto; }
#chat-hide {
	padding: 0 var(--ij-space-2); font-size: var(--ij-fs-3); color: var(--dim);
	border-radius: var(--ij-radius-sm);
}
#chat-hide:hover { background: var(--hover); color: var(--text); }

#chat-log {
	flex: 1; min-height: 0; overflow-y: auto; outline: none; font-size: var(--ij-fs-6);
	padding: var(--ij-space-1) var(--ij-space-3) var(--ij-space-4);
}
/* Focused and inactive selection are two colours in the theme file, never one
   colour at two opacities. The transcript takes click focus (tabindex="-1",
   so the tab order is unchanged) exactly so it can lose it again. */
#chat-log ::selection {
	background: var(--ij-selection-inactive); color: var(--ij-selection-text);
}
#chat-log:focus ::selection { background: var(--ij-selection); }

.turn { position: relative; margin: var(--ij-space-2) 0; }
/* One hairline per exchange: the user's turn opens the next one. */
.turn.user {
	display: flex; justify-content: flex-end;
	border-top: 1px solid var(--border); padding-top: var(--ij-space-3);
}
#chat-log > .turn.user:first-child { border-top: none; padding-top: var(--ij-space-1); }
/* A tinted block, not a chat bubble: HelpBrowser.UserMessage.background with
   square corners — this idiom rounds controls, never a block of text. */
.turn.user .said {
	max-width: 85%; padding: var(--ij-space) var(--ij-space-2);
	background: var(--ij-selection-inactive); color: var(--ij-selection-text);
	white-space: pre-wrap; overflow-wrap: break-word;
}
.turn.model .body { overflow-wrap: break-word; }
.turn time {
	position: absolute; top: calc(var(--ij-space-1) * -1); right: 0; pointer-events: none;
	font: var(--ij-fs-1) var(--font-code); color: var(--dim);
	opacity: 0; transition: opacity .12s;
}
.turn:hover time { opacity: .8; }
/* Rendered markdown reuses the reader's rules (styles-docs) but sits flush. */
.turn .md > :first-child { margin-top: 0; }
.turn .md > :last-child { margin-bottom: 0; }
.turn .md table { font-size: var(--ij-fs-5); }
.turn .md h1, .turn .md h2, .turn .md h3 {
	font-size: var(--ij-fs-7); margin: var(--ij-space-3) 0 var(--ij-space);
}
.turn-err {
	margin: var(--ij-space) 0 var(--ij-space-2); padding-left: var(--ij-space-2);
	font-size: var(--ij-fs-4); color: var(--dim);
	border-left: 1px solid var(--err);
}
.streaming::after {
	content: "▍"; color: var(--accent); animation: ah-caret 1s steps(2) infinite;
}
@keyframes ah-caret { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .streaming::after { animation: none; } }

#chat-compose {
	padding: var(--ij-space-2) var(--ij-space-3); border-top: 1px solid var(--border);
}
/* Component.borderColor is the control frame; --border is the panel hairline. */
#chat-input, #chat-backend {
	color: var(--text); background: var(--bg); outline: none;
	border: 1px solid var(--ij-border-control);
}
#chat-input {
	display: block; width: 100%; resize: none;
	min-height: calc(var(--ij-control-h) * 2); max-height: calc(var(--ij-control-h) * 5);
	font: var(--ij-fs-6)/var(--ij-lh) var(--font-ui);
	padding: var(--ij-space) var(--ij-space-2); border-radius: var(--ij-radius);
}
#chat-input::placeholder { color: var(--ij-text-disabled); }
#chat-backend {
	flex: none; max-width: 45%; height: var(--ij-row-h);
	font-size: var(--ij-fs-3); border-radius: var(--ij-radius-sm);
	padding: 0 var(--ij-space-1) 0 var(--ij-space);
}
#chat-backend:hover { background: var(--hover); }
/* *.focusColor, drawn the way IntelliJ draws it: the control's own border
   turns accent and a one-pixel ring sits just outside it. */
#chat-input:focus, #chat-backend:focus {
	border-color: var(--ij-focus-ring);
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
}
/* *.disabledText — never an opacity, which would tint the background too. */
#chat-input:disabled, #chat-backend:disabled, #chat-backend option:disabled,
#chat-send[disabled], #chat-stop[disabled] {
	color: var(--ij-text-disabled); cursor: default;
}
/* A disabled default button stops being the default one: it drops the accent
   fill for the ordinary disabled plate, exactly as .act[disabled] does. */
#chat-send[disabled], #chat-send[disabled]:hover {
	background: var(--ij-bg-panel); border-color: var(--ij-separator);
}

/* One row: cwd, then the note, then the button at the right. */
.chat-actions {
	display: flex; align-items: center; gap: var(--ij-space-2); margin-top: var(--ij-space-2);
}
#chat-cwd {
	flex: 1; min-width: 0; font: var(--ij-fs-2) var(--font-code); color: var(--dim);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#chat-note { flex: none; font-size: var(--ij-fs-3); color: var(--warn); }
#chat-note:empty { display: none; }
#chat-send, #chat-stop {
	flex: none; height: var(--ij-control-h); padding: 0 var(--ij-space-3);
	font-size: var(--ij-fs-5); border-radius: var(--ij-radius);
	color: var(--text); background: var(--bg); border: 1px solid var(--ij-border-control);
}
#chat-stop:hover { background: var(--hover); border-color: var(--dim); }
/* Button.default: a filled Blue4/Blue6 under Button.default.foreground — white
   in BOTH themes, not the Badge pair --on-accent carries. The hover fill is one
   derived Blue step off it; the theme has no hover key for this button. */
#chat-send {
	background: var(--accent); border-color: var(--accent); color: var(--ij-button-default-fg);
}
#chat-send:hover { background: var(--ij-accent-hover); border-color: var(--ij-accent-hover); }
#chat-send:focus-visible { border-color: var(--ij-text-on-accent); }
#chat-send:focus-visible, #chat-stop:focus-visible {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
	outline-offset: var(--ij-focus-ring-w);
}
`;
