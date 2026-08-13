/**
 * Tool window 5: Chat — a quiet transcript, a one-row composer. Ported from
 * client-chat.ts / client-shell.ts CHAT_HTML; the wire lives in use-chat.ts.
 *
 * The rail's width and visibility belong to the workbench (root search params
 * and the shared Grip), so this file owns only what is inside the panel.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useBackends } from "./use-backends.js";
import { useChat } from "./use-chat.js";
import { ChatTurn } from "./ChatTurn.js";
import "./chat.css";

/** Grows with the text up to the stylesheet's max-height cap (five control heights). */
function autogrow(el: HTMLTextAreaElement): void {
	const cap = Number.parseFloat(getComputedStyle(el).maxHeight);
	el.style.height = "auto";
	el.style.height = `${cap > 0 ? Math.min(el.scrollHeight, cap) : el.scrollHeight}px`;
}

export function ChatRail() {
	const navigate = useNavigate();
	const { backends, failed, backendId, pick, note } = useBackends();
	const { msgs, busy, send, stop } = useChat();
	const logRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// The transcript follows the newest text, streaming or rendered.
	useEffect(() => {
		const log = logRef.current;
		if (log !== null) log.scrollTop = log.scrollHeight;
	});

	const sendNow = (): void => {
		const input = inputRef.current;
		if (input === null) return;
		const text = input.value.trim();
		if (text === "" || busy) return;
		if (backendId === "") return; // no backend available; the note says so
		input.value = "";
		autogrow(input);
		void send(backendId, text);
	};

	const hide = (): void => {
		void navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({ ...prev, chat: false }),
		});
	};

	const last = msgs.length - 1;
	return (
		<aside id="chat">
			<div className="tw-head chat-head">
				<span className="tw-num">5</span>
				<span>Chat</span>
				<select id="chat-backend" title="Backend" value={backendId} onChange={(e) => pick(e.target.value)}>
					{backends === null ? (
						<option value="">loading…</option>
					) : failed ? (
						<option value="">backends unavailable</option>
					) : backends.length === 0 ? (
						<option value="">no backends configured</option>
					) : (
						backends.map((b) => (
							<option key={b.id} value={b.id} disabled={!b.available}>
								{b.label + (b.available ? "" : ` — ${b.note ?? "unavailable"}`)}
							</option>
						))
					)}
				</select>
				<button id="chat-hide" type="button" title="Hide chat (⌘6)" onClick={hide}>
					✕
				</button>
			</div>
			<div id="chat-log" tabIndex={-1} ref={logRef}>
				{msgs.length === 0 ? (
					<div className="empty small">Ask the model about the selected project.</div>
				) : (
					msgs.map((m, i) => (
						<ChatTurn key={i} m={m} streaming={busy && i === last && m.role === "assistant" && m.err !== true} />
					))
				)}
			</div>
			<div id="chat-compose">
				<textarea
					id="chat-input"
					rows={2}
					placeholder="Message (Enter sends, Shift+Enter newline)"
					spellCheck={false}
					ref={inputRef}
					onInput={(e) => autogrow(e.currentTarget)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							sendNow();
						}
					}}
				/>
				<div className="chat-actions">
					<span id="chat-cwd" title="Working directory">
						cwd: no project selected
					</span>
					<span id="chat-note">{note}</span>
					{/* Stop stands in for Send while a reply streams. */}
					<button id="chat-stop" type="button" hidden={!busy} onClick={stop}>
						Stop
					</button>
					<button id="chat-send" type="button" hidden={busy} onClick={sendNow}>
						Send
					</button>
				</div>
			</div>
		</aside>
	);
}
