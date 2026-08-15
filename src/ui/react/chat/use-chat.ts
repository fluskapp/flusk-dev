/**
 * The chat turn machine, ported from client-chat.ts / client-chat-stream.ts:
 * deltas land as plain text so the reader sees the reply being written; the
 * finished text goes to the server's one renderer and comes back as HTML. A
 * lost render must never cost the reply.
 */
import { useCallback, useRef, useState } from "react";
import { renderText } from "../../../features/docs/lsp.functions.js";
import { chatBody, chatClock, type ChatMsg } from "./chat-model.js";
import { readSseStream } from "./sse.js";

type Chunk = { type: "delta"; text: string } | { type: "error"; message: string } | { type: "done" };

export interface ChatApi {
	msgs: ChatMsg[];
	busy: boolean;
	/** `sent` is the composed prompt when attachments rode along (chat-model.ts). */
	send: (backendId: string, text: string, sent?: string, cwd?: string) => Promise<void>;
	stop: () => void;
}

export function useChat(): ChatApi {
	// Mutated in place like the legacy S.chat.msgs, repainted by tick: a delta
	// arrives every few ms and re-cloning the transcript for each is churn.
	const msgsRef = useRef<ChatMsg[]>([]);
	const abortRef = useRef<AbortController | null>(null);
	const [busy, setBusy] = useState(false);
	const [, setTick] = useState(0);
	const repaint = useCallback(() => setTick((t) => t + 1), []);

	const appendDelta = useCallback(
		(text: string) => {
			const msgs = msgsRef.current;
			let last = msgs[msgs.length - 1];
			if (last === undefined || last.role !== "assistant" || last.err === true) {
				last = { role: "assistant", content: "", at: chatClock() };
				msgs.push(last);
			}
			last.content += text;
			repaint();
		},
		[repaint],
	);

	/** Failures are RENDER-ONLY: chatBody() drops flagged turns from the request. */
	const chatError = useCallback(
		(message: string) => {
			const msgs = msgsRef.current;
			const last = msgs[msgs.length - 1];
			if (last !== undefined && last.role === "assistant" && last.content === "" && last.err !== true) {
				msgs.pop();
			}
			msgs.push({ role: "assistant", content: message, err: true, at: chatClock() });
			repaint();
		},
		[repaint],
	);

	/** Server HTML or nothing: an empty or failed render leaves the text alone. */
	const finishTurn = useCallback(
		async (m: ChatMsg | undefined) => {
			if (m === undefined || m.role !== "assistant" || m.err === true || m.content === "") return;
			try {
				const { html } = await renderText({ data: { text: m.content } });
				if (html !== "") m.html = html;
			} catch {
				/* keep the plain text */
			}
			repaint();
		},
		[repaint],
	);

	const send = useCallback(
		async (backendId: string, text: string, sent?: string, cwd?: string) => {
			const msgs = msgsRef.current;
			if (text === "" || abortRef.current !== null) return;
			msgs.push({ role: "user", content: text, at: chatClock(), ...(sent === undefined ? {} : { sent }) });
			// Captured, so this call's teardown can tell whether it is still the one
			// in flight: after Stop, a second send can start while the first is
			// still unwinding, and the first one's tail must not null the second's
			// controller — leaving Stop unable to abort the stream on screen.
			const ac = new AbortController();
			abortRef.current = ac;
			setBusy(true);
			repaint();
			try {
				const r = await fetch("/api/chat", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(chatBody(backendId, msgs, cwd)),
					signal: ac.signal,
				});
				if (!r.ok || r.body === null) chatError(`chat failed: HTTP ${r.status}`);
				else {
					await readSseStream(r.body, (raw) => {
						const chunk = raw as Chunk;
						if (chunk.type === "delta") appendDelta(chunk.text);
						else if (chunk.type === "error") chatError(chunk.message);
						return chunk.type === "done";
					});
				}
			} catch (e) {
				if (!ac.signal.aborted) chatError(String((e as Error | null)?.message ?? e));
			}
			if (abortRef.current === ac) {
				abortRef.current = null;
				setBusy(false);
			}
			// Stop lands here too, with a partial reply: render what did arrive.
			await finishTurn(msgs[msgs.length - 1]);
		},
		[appendDelta, chatError, finishTurn, repaint],
	);

	/** Abort the fetch and keep whatever already arrived on screen. */
	const stop = useCallback(() => {
		abortRef.current?.abort();
		abortRef.current = null;
		setBusy(false);
		repaint();
	}, [repaint]);

	return { msgs: msgsRef.current, busy, send, stop };
}
