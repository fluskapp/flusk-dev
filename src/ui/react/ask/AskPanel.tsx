/**
 * The Ask-AI panel (window 0): ask any agent about what is on screen, with the
 * context already attached and NOTHING HIDDEN. Ported from client-ask.ts.
 *
 * The snapshot rule: mounting with a snapshot already taken does NOT
 * re-capture (returning to the tab must not replace the context an answer was
 * about); the explicit button and the "flusk:ask-capture" event — the toolbar
 * 0/a verb's hand-off — do.
 */
import { useEffect, useReducer } from "react";
import { ASK_ACTIONS } from "../../../features/orchestra/ask.functions.js";
import { AskAnswer } from "./AskAnswer.js";
import { AskContextCard } from "./AskContextCard.js";
import { askCapture, askLoadAnswerers } from "./ask-logic.js";
import { sendAsk, stopAsk } from "./ask-send.js";
import { A, ASK_WHO_KEY, repaint, subscribe } from "./ask-store.js";
import { askOptionLabel, askViaText } from "./ask-who.js";
import "./ask.css";

function WhoPicker() {
	const of = (kind: "agent" | "backend") => A.answerers.filter((a) => a.kind === kind);
	const group = (title: string, rows: typeof A.answerers) =>
		rows.length === 0 ? null : (
			<optgroup label={title}>
				{rows.map((a) => (
					<option key={a.id} value={a.id} disabled={!a.available}>
						{askOptionLabel(a)}
					</option>
				))}
			</optgroup>
		);
	return (
		<select
			id="ask-who"
			title="Who answers"
			value={A.who}
			onChange={(e) => {
				A.who = e.target.value;
				try {
					localStorage.setItem(ASK_WHO_KEY, A.who);
				} catch {
					/* private mode */
				}
				// A full repaint: the agent's own prompt is part of the context card.
				repaint();
			}}
		>
			{A.answerers.length === 0 ? (
				<option value="">{A.whoErr !== "" ? A.whoErr : "no answerer available"}</option>
			) : (
				<>
					{group("Agents", of("agent"))}
					{group("Backends", of("backend"))}
				</>
			)}
		</select>
	);
}

export function AskPanel() {
	const [, tick] = useReducer((c: number) => c + 1, 0);
	useEffect(() => subscribe(tick), []);
	useEffect(() => {
		if (A.recapture || A.ctx === null) {
			A.recapture = false;
			void askCapture();
		} else void askLoadAnswerers();
		const onCapture = (): void => void askCapture();
		document.addEventListener("flusk:ask-capture", onCapture);
		return () => document.removeEventListener("flusk:ask-capture", onCapture);
	}, []);
	return (
		<div className="ask-wrap">
			<div className="ask-head">
				<WhoPicker />
				<span id="ask-via" className="dim small">
					{askViaText()}
				</span>
				<span className="spacer" />
				<button
					id="ask-refresh"
					type="button"
					className="act"
					title="Re-read the file and symbol on screen"
					onClick={() => void askCapture()}
				>
					Use what is on screen
				</button>
			</div>
			<AskContextCard />
			<div className="ask-acts">
				{ASK_ACTIONS.map((a) => (
					// An action is a PRE-FILLED question, never a hidden mode.
					<button key={a.id} type="button" className="act" data-ask-act={a.id} onClick={() => {
						A.q = a.question;
						repaint();
						document.getElementById("ask-q")?.focus();
					}}>
						{a.label}
					</button>
				))}
			</div>
			<textarea
				id="ask-q"
				rows={3}
				spellCheck={false}
				placeholder="Ask about the context above (⌘↩ sends)"
				value={A.q}
				onChange={(e) => {
					A.q = e.target.value;
					repaint();
				}}
				onKeyDown={(e) => {
					// ⌘↩ sends; a bare Enter is a newline — a question here is usually
					// more than one line, and losing it to a stray Enter is unforgivable.
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						void sendAsk();
					}
				}}
			/>
			<div className="ask-row">
				<button id="ask-send" type="button" className="act" hidden={A.busy} onClick={() => void sendAsk()}>
					Ask
				</button>
				<button id="ask-stop" type="button" className="act" hidden={!A.busy} onClick={stopAsk}>
					Stop
				</button>
				<span id="ask-note" className="dim small" />
			</div>
			<AskAnswer />
		</div>
	);
}
