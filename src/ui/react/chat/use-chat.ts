/**
 * The chat turn machine, ported from client-chat.ts / client-chat-stream.ts:
 * deltas land as plain text so the reader sees the reply being written; the
 * finished text goes to the server's one renderer and comes back as HTML. A
 * lost render must never cost the reply. This hook also owns the turn's live
 * state (starting → waiting → streaming), the conversation id the server's
 * meta frame announces, and restore-on-mount from ~/.flusk/chats/.
 */
import { useCallback, useRef, useState } from "react";
import type { ChatChunk } from "../../../features/chat/types.js";
import { renderText } from "../../../features/docs/lsp.functions.js";
import { fetchLatest } from "./chat-load.js";
import { chatBody, chatClock, type ChatMsg, type ChatRun } from "./chat-model.js";
import { applyChunk, attachRun, newRun } from "./chat-run.js";
import { pushError, resetLive, type ChatLive } from "./chat-turns.js";
import { readSseStream } from "./sse.js";

export type { ChatLive } from "./chat-turns.js";

export interface ChatApi {
	msgs: ChatMsg[];
	busy: boolean;
	live: ChatLive;
	/** `sent` is the composed prompt when attachments rode along (chat-model.ts). */
	send: (backendId: string, text: string, sent?: string, cwd?: string) => Promise<void>;
	stop: () => void;
	/** Restore the newest conversation; no-op when msgs exist or busy. */
	loadLatest: () => Promise<void>;
	/** New conversation: clear transcript + conversation id. Refused while busy. */
	reset: () => void;
}

export function useChat(): ChatApi {
	// Mutated in place like the legacy S.chat.msgs, repainted by tick: a delta
	// arrives every few ms and re-cloning the transcript for each is churn.
	const msgsRef = useRef<ChatMsg[]>([]);
	const convRef = useRef<string | null>(null);
	const runRef = useRef<ChatRun>(newRun());
	const liveRef = useRef<ChatLive>({ phase: "idle", startedAt: 0, tools: [], backend: "" });
	const abortRef = useRef<AbortController | null>(null);
	const [busy, setBusy] = useState(false);
	const [, setTick] = useState(0);
	const repaint = useCallback(() => setTick((t) => t + 1), []);

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
			const live = liveRef.current;
			if (text === "" || abortRef.current !== null) return;
			msgs.push({ role: "user", content: text, at: chatClock(), ...(sent === undefined ? {} : { sent }) });
			// Captured, so this call's teardown can tell whether it is still the one
			// in flight: after Stop, a second send can start while the first is
			// still unwinding, and the first one's tail must not null the second's
			// controller — leaving Stop unable to abort the stream on screen.
			const ac = new AbortController();
			abortRef.current = ac;
			live.phase = "starting";
			live.startedAt = Date.now();
			live.tools = [];
			live.backend = backendId;
			runRef.current = newRun();
			setBusy(true);
			repaint();
			try {
				const r = await fetch("/api/chat", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(chatBody(backendId, msgs, cwd, convRef.current ?? undefined)),
					signal: ac.signal,
				});
				if (!r.ok || r.body === null) pushError(msgs, `chat failed: HTTP ${r.status}`);
				else {
					live.phase = "waiting";
					repaint();
					await readSseStream(r.body, (raw) => {
						const chunk = raw as ChatChunk;
						// applyChunk mutates transcript/live/run; unknown types fall through.
						const conv = applyChunk(msgs, live, runRef.current, chunk);
						if (conv !== null) convRef.current = conv;
						repaint();
						return chunk.type === "done";
					});
				}
			} catch (e) {
				if (!ac.signal.aborted) pushError(msgs, String((e as Error | null)?.message ?? e));
			}
			if (abortRef.current === ac) {
				abortRef.current = null;
				setBusy(false);
				// Stop resets the live state itself; a superseded tail stays out of it.
				resetLive(live);
			}
			// The finished turn takes the run record — the expander renders from it.
			attachRun(msgs, runRef.current);
			repaint();
			// Stop lands here too, with a partial reply: render what did arrive.
			await finishTurn(msgs[msgs.length - 1]);
		},
		[finishTurn, repaint],
	);

	/** Abort the fetch and keep whatever already arrived on screen. */
	const stop = useCallback(() => {
		abortRef.current?.abort();
		abortRef.current = null;
		setBusy(false);
		resetLive(liveRef.current);
		repaint();
	}, [repaint]);

	const loadLatest = useCallback(async () => {
		if (msgsRef.current.length > 0 || abortRef.current !== null) return;
		const got = await fetchLatest();
		// Re-checked: a send may have started while the history call was in flight.
		if (got === null || msgsRef.current.length > 0 || abortRef.current !== null) return;
		convRef.current = got.id;
		msgsRef.current.push(...got.msgs);
		repaint();
	}, [repaint]);

	const reset = useCallback(() => {
		if (abortRef.current !== null) return;
		msgsRef.current.length = 0;
		convRef.current = null;
		resetLive(liveRef.current);
		repaint();
	}, [repaint]);

	return { msgs: msgsRef.current, busy, live: liveRef.current, send, stop, loadLatest, reset };
}
