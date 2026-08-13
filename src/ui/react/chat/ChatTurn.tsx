/**
 * One turn. No role labels: the user's words sit in a tinted block on the
 * right, the model's are body text at full width, a failure is one muted line.
 * Ported from client-chat.ts turnHtml.
 */
import type { ChatMsg } from "./chat-model.js";

export function ChatTurn({ m, streaming }: { m: ChatMsg; streaming: boolean }) {
	if (m.err === true) return <div className="turn-err">{m.content}</div>;
	const when = <time>{m.at}</time>;
	if (m.role === "user") {
		return (
			<div className="turn user">
				<div className="said">{m.content}</div>
				{when}
			</div>
		);
	}
	// The html is the SERVER's render of the reply text (renderText escapes);
	// plain text with a caret while it arrives, markup once the turn finishes.
	const body =
		m.html !== undefined ? (
			<div className="body md" dangerouslySetInnerHTML={{ __html: m.html }} />
		) : (
			<div className={streaming ? "body pre streaming" : "body pre"} id={streaming ? "chat-stream" : undefined}>
				{m.content}
			</div>
		);
	return (
		<div className="turn model">
			{body}
			{when}
		</div>
	);
}
