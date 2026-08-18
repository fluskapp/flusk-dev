/**
 * Tool window 5: Chat — talk with your code, with a spec, with a run. One
 * quiet transcript, an attachments strip, a one-row composer. Ask folded in
 * here (docs/experience.md): its context card is the strip, its answerer
 * picker is the header combo, and the outgoing prompt is composed by the same
 * ask-prompt machinery. The wire stays /api/chat, in use-chat.ts.
 *
 * The rail's width and visibility belong to the workbench (root search params
 * and the shared Grip), so this file owns only what is inside the panel.
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useReducer, useRef } from "react";
import { Ic } from "../system/Icon.js";
import { AttachStrip } from "./AttachStrip.js";
import { loadAnswerers, onBlocks, preambleText } from "./attach-logic.js";
import { AT, subscribe } from "./attach-store.js";
import { whoEmptyLabel, whoRow } from "./attach-who.js";
import { ChatComposer } from "./ChatComposer.js";
import { ChatStatus } from "./ChatStatus.js";
import { ChatTurn } from "./ChatTurn.js";
import { ChatWho } from "./ChatWho.js";
import { effectiveCwd, routeProject } from "./chat-cwd.js";
import { composeOutgoing } from "./chat-model.js";
import { useChat } from "./use-chat.js";
import "./chat.css";
import "./attach.css";

export function ChatRail() {
	const navigate = useNavigate();
	const [, tick] = useReducer((c: number) => c + 1, 0);
	useEffect(() => subscribe(tick), []);
	// Mounting does NOT re-capture code context (the snapshot rule); it only
	// refreshes who can answer, which is this machine's state, not a choice.
	useEffect(() => {
		void loadAnswerers();
	}, []);
	const { msgs, busy, live, send, stop, loadLatest, reset } = useChat();
	// Mounting restores the newest conversation (guarded no-op inside).
	useEffect(() => {
		void loadLatest();
	}, [loadLatest]);
	const rp = useRouterState({ select: (s) => routeProject(s) });
	const cwd = effectiveCwd(rp);
	const logRef = useRef<HTMLDivElement>(null);

	// The transcript follows the newest text, streaming or rendered.
	useEffect(() => {
		const log = logRef.current;
		if (log !== null) log.scrollTop = log.scrollHeight;
	});

	/** Compose exactly what the strip discloses, then hand it to the wire. */
	const sendNow = (text: string): boolean => {
		const who = whoRow();
		if (who === null || !who.available || who.backendId === null) return false;
		const composed = composeOutgoing(text, onBlocks(), preambleText());
		void send(
			who.backendId,
			text,
			composed === text ? undefined : composed,
			cwd === "" ? undefined : cwd,
		);
		return true;
	};

	const hide = (): void => {
		void navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({ ...prev, chat: false }),
		});
	};

	const usable = AT.answerers.some((a) => a.available);
	// Same conflation guard as ChatWho: a roster that has not loaded yet says
	// nothing here — the header combo already shows "detecting backends…".
	const note =
		AT.whoErr !== ""
			? AT.whoErr
			: AT.whoLoaded && AT.answerers.length === 0
				? whoEmptyLabel(true, "")
				: AT.answerers.length > 0 && !usable
					? "no answerer available"
					: "";
	const last = msgs.length - 1;
	return (
		<aside id="chat">
			<div className="tw-head chat-head">
				<span className="tw-num">5</span>
				<span>Chat</span>
				<ChatWho />
				<button id="chat-new" type="button" title="New conversation" onClick={reset}>
					<Ic name="plus" size={14} />
				</button>
				<button id="chat-hide" type="button" title="Hide chat (⌘6)" onClick={hide}>
					<Ic name="close" size={14} />
				</button>
			</div>
			<div id="chat-log" tabIndex={-1} ref={logRef}>
				{msgs.length === 0 ? (
					<div className="empty small">
						Talk — with your code, with a spec, with a run. Attach below.
					</div>
				) : (
					msgs.map((m, i) => (
						<ChatTurn
							key={i}
							m={m}
							streaming={busy && i === last && m.role === "assistant" && m.err !== true}
						/>
					))
				)}
				<ChatStatus live={live} />
			</div>
			<AttachStrip />
			<ChatComposer busy={busy} note={note} cwd={cwd} onSend={sendNow} onStop={stop} />
		</aside>
	);
}
