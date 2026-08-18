/**
 * The reply's mechanics behind one collapsed line: "▸ claude -p · 2 tools ·
 * $0.021 · 5s". Expanding reveals the exact spawned invocation and its cwd in
 * the code face (copyable), every persisted tool-activity line (the live view
 * caps at TOOL_MAX; this shows them all), and the failure text when the turn
 * errored. Collapsed by default and never persisted per turn — a fresh mount
 * starts collapsed. A real button, so it is keyboard reachable and carries
 * the focus ring (the decisions.css twisty idiom).
 *
 * "Short summary" scope: a long final reply stays fully visible in the turn
 * above (ChatTurn's fold covers sheer length) — it is never auto-summarized
 * with another model call. The prominent text IS the summary the model wrote;
 * this expander is the detail layer beneath it.
 */
import { useState } from "react";
import type { ChatRun } from "./chat-model.js";
import { runLabel } from "./chat-run.js";

export function ChatTurnRun({ run }: { run: ChatRun | undefined }) {
	const [open, setOpen] = useState(false);
	if (run === undefined) return null;
	return (
		<div className="turn-run">
			<button
				type="button"
				className="turn-run-toggle"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
			>
				<span className="chev">{open ? "▾" : "▸"}</span>
				{runLabel(run)}
			</button>
			{!open ? null : (
				<div className="turn-run-detail">
					{run.cmd === undefined ? null : <code className="run-cmd">{run.cmd}</code>}
					{run.cwd === undefined ? null : <code className="run-cwd">cwd: {run.cwd}</code>}
					{run.tools.map((label, i) => (
						<div key={i} className="tool-line">
							{label}
						</div>
					))}
					{run.stderr === undefined ? null : <pre className="run-stderr">{run.stderr}</pre>}
				</div>
			)}
		</div>
	);
}
