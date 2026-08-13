/**
 * The answer and its receipt, ported from client-ask-send.ts askAnswerHtml:
 * plain text while it streams, the server's markdown at the end, and the
 * exact prompt under it — not hidden behind a flag, because a prompt you
 * cannot read is a prompt you cannot debug.
 */
import { A } from "./ask-store.js";

export function AskAnswer() {
	if (A.answer === "" && A.html === "" && A.fail === "" && A.prompt === "") {
		return (
			<section className="ask-out">
				<div className="ask-empty">No answer yet. Pick an action above, or write a question.</div>
			</section>
		);
	}
	return (
		<section className="ask-out">
			{A.fail !== "" ? <div className="ask-fail">{A.fail}</div> : null}
			{A.html !== "" ? (
				// The html is the server's one renderer's output, which escapes.
				<div className="ask-answer md" dangerouslySetInnerHTML={{ __html: A.html }} />
			) : (
				<div className="ask-answer pre" id="ask-stream">
					{A.answer}
				</div>
			)}
			{A.prompt !== "" ? (
				<details className="ask-sent">
					<summary>Exact prompt sent ({A.prompt.length} characters)</summary>
					<pre id="ask-sent-body">{A.prompt}</pre>
				</details>
			) : null}
		</section>
	);
}
