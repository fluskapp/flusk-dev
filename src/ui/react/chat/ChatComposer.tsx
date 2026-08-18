/**
 * The composer row and its two send gestures. Plain chat keeps its own: Enter
 * sends, Shift+Enter breaks the line. With attachments on the strip the Ask
 * muscle memory takes over: ⌘↩ sends and a bare Enter is a newline — a
 * question over attached context is usually more than one line, and losing it
 * to a stray Enter is unforgivable. ⌘↩ always sends, so one gesture works
 * everywhere.
 */
import { useRef } from "react";
import { allBlocks, preambleText } from "./attach-logic.js";

/** Grows with the text up to the stylesheet's max-height cap (five control heights). */
function autogrow(el: HTMLTextAreaElement): void {
	const cap = Number.parseFloat(getComputedStyle(el).maxHeight);
	el.style.height = "auto";
	el.style.height = `${cap > 0 ? Math.min(el.scrollHeight, cap) : el.scrollHeight}px`;
}

/** The strip is non-empty — the send gestures switch to Ask's. */
const attached = (): boolean => allBlocks().length > 0 || preambleText() !== "";

export interface ComposerProps {
	busy: boolean;
	/** "no answerer available" and friends; empty when a send can go. */
	note: string;
	/** The effective working directory (chat-cwd.ts); "" = none selected. */
	cwd: string;
	/** Returns false when the message was refused, so the text survives. */
	onSend: (text: string) => boolean;
	onStop: () => void;
}

export function ChatComposer({ busy, note, cwd, onSend, onStop }: ComposerProps) {
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const fire = (): void => {
		const input = inputRef.current;
		if (input === null) return;
		const text = input.value.trim();
		if (text === "" || busy) return;
		if (!onSend(text)) return;
		input.value = "";
		autogrow(input);
	};
	return (
		<div id="chat-compose">
			<textarea
				id="chat-input"
				rows={2}
				placeholder={attached() ? "Ask about the attachments (⌘↩ sends)" : "Message (Enter sends, Shift+Enter newline)"}
				spellCheck={false}
				ref={inputRef}
				onInput={(e) => autogrow(e.currentTarget)}
				onKeyDown={(e) => {
					if (e.key !== "Enter") return;
					if (e.metaKey || e.ctrlKey) {
						e.preventDefault();
						fire();
					} else if (!e.shiftKey && !attached()) {
						e.preventDefault();
						fire();
					}
					// Shift+Enter, and a bare Enter over attachments: the newline.
				}}
			/>
			<div className="chat-actions">
				{/* Sending stays allowed without a cwd: HTTP backends need none, and a
				    CLI backend answers with the engine's error naming this remedy. */}
				<span id="chat-cwd" className={cwd === "" ? "warn" : undefined} title="Working directory">
					cwd: {cwd === "" ? "none — select a project (⌘1)" : cwd}
				</span>
				<span id="chat-note">{note}</span>
				{/* Stop stands in for Send while a reply streams. */}
				<button id="chat-stop" type="button" hidden={!busy} onClick={onStop}>
					Stop
				</button>
				<button id="chat-send" type="button" hidden={busy} onClick={fire}>
					Send
				</button>
			</div>
		</div>
	);
}
