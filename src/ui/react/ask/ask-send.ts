/**
 * The Ask-AI wire, ported from client-ask-send.ts. It reuses the chat rail's
 * SSE reader (one framing bug is enough), and the first frame is the PROMPT:
 * the literal text the model received, rendered under the answer because the
 * only way to trust an auto-attached context is to read what it turned into.
 */
import { renderText } from "../../../features/docs/lsp.functions.js";
import { readSseStream } from "../chat/sse.js";
import { askBlocks, askCwd } from "./ask-logic.js";
import { A, repaint } from "./ask-store.js";

type Chunk =
	| { type: "prompt"; text: string }
	| { type: "delta"; text: string }
	| { type: "error"; message: string }
	| { type: "done" };

/** Markdown at the end only; a failed render costs formatting, never the answer. */
async function askFinish(): Promise<void> {
	if (A.answer !== "") {
		try {
			A.html = (await renderText({ data: { text: A.answer, lang: "md" } })).html;
		} catch {
			/* keep the text */
		}
	}
	repaint();
}

export async function sendAsk(): Promise<void> {
	const question = A.q.trim();
	if (question === "" || A.busy) return;
	if (A.who === "") {
		// The legacy toast; the fail line is this panel's visible surface.
		A.fail = A.whoErr !== "" ? A.whoErr : "No answerer available";
		repaint();
		return;
	}
	A.answer = "";
	A.html = "";
	A.prompt = "";
	A.fail = "";
	A.busy = true;
	const ac = new AbortController();
	A.abort = ac;
	repaint();
	const cwd = askCwd();
	try {
		const r = await fetch("/api/ask", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				answererId: A.who,
				question,
				blocks: askBlocks(),
				cwd: cwd === "" ? undefined : cwd,
			}),
			signal: ac.signal,
		});
		if (!r.ok || r.body === null) A.fail = `ask failed: HTTP ${r.status}`;
		else {
			await readSseStream(r.body, (raw) => {
				const chunk = raw as Chunk;
				if (chunk.type === "prompt") A.prompt = chunk.text;
				else if (chunk.type === "delta") A.answer += chunk.text;
				else if (chunk.type === "error") A.fail = chunk.message;
				repaint();
				return chunk.type === "done";
			});
		}
	} catch (e) {
		if (!ac.signal.aborted) A.fail = String((e as Error | null)?.message ?? e);
	}
	if (A.abort === ac) {
		A.busy = false;
		A.abort = null;
	}
	await askFinish();
}

/** Stop keeps whatever arrived — a partial answer is still an answer. */
export function stopAsk(): void {
	A.abort?.abort();
	A.abort = null;
	A.busy = false;
	repaint();
}
