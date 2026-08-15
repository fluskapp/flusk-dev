/**
 * One turn. No role labels: the user's words sit in a tinted block on the
 * right, the model's are body text at full width, a failure is one muted line.
 * Ported from client-chat.ts turnHtml.
 *
 * Turns past FOLD_LINES fold to their head with a "show all" toggle — the
 * transcript collapse idiom, applied to conversation. Folding never runs while
 * a reply streams: the log follows the newest text, and hiding it mid-arrival
 * would take the reply out of the reader's hands.
 */
import { useState } from "react";
import { FOLD_LINES, type ChatMsg } from "./chat-model.js";

const lineCount = (s: string): number => s.split("\n").length;

/** The receipt: the exact composed text the model received, never hidden. */
function Sent({ text }: { text: string }) {
	return (
		<details className="turn-sent">
			<summary>exact text sent ({text.length} characters)</summary>
			<pre>{text}</pre>
		</details>
	);
}

function FoldToggle({ lines, open, flip }: { lines: number; open: boolean; flip: () => void }) {
	return (
		<button type="button" className="turn-fold" onClick={flip}>
			{open ? "Show less" : `Show all — ${lines} lines`}
		</button>
	);
}

export function ChatTurn({ m, streaming }: { m: ChatMsg; streaming: boolean }) {
	const [open, setOpen] = useState(false);
	if (m.err === true) return <div className="turn-err">{m.content}</div>;
	const lines = lineCount(m.content);
	const foldable = lines > FOLD_LINES && !streaming;
	const folded = foldable && !open;
	const when = <time>{m.at}</time>;
	if (m.role === "user") {
		return (
			<div className="turn user">
				<div className="said-wrap">
					<div className={folded ? "said folded" : "said"}>{m.content}</div>
					{foldable ? <FoldToggle lines={lines} open={open} flip={() => setOpen(!open)} /> : null}
					{m.sent !== undefined ? <Sent text={m.sent} /> : null}
				</div>
				{when}
			</div>
		);
	}
	// The html is the SERVER's render of the reply text (renderText escapes);
	// plain text with a caret while it arrives, markup once the turn finishes.
	const fold = folded ? " folded" : "";
	const body =
		m.html !== undefined ? (
			<div className={`body md${fold}`} dangerouslySetInnerHTML={{ __html: m.html }} />
		) : (
			<div
				className={streaming ? "body pre streaming" : `body pre${fold}`}
				id={streaming ? "chat-stream" : undefined}
			>
				{m.content}
			</div>
		);
	return (
		<div className="turn model">
			{body}
			{foldable ? <FoldToggle lines={lines} open={open} flip={() => setOpen(!open)} /> : null}
			{when}
		</div>
	);
}
