/**
 * The busy block at the tail of the transcript: what the reply is doing right
 * now, from click to first byte. Owns its own 1-second ticker so the
 * transcript does not repaint per second. No animation — a counting number is
 * not motion, so reduced-motion needs nothing turned off.
 */
import { useEffect, useState } from "react";
import { stateParts, type ChatLive } from "./chat-turns.js";

export function ChatStatus({ live }: { live: ChatLive }) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		setNow(Date.now());
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [live.startedAt]);
	if (live.phase === "idle") return null;
	const [head, sec, tail] = stateParts(live, now);
	return (
		<div id="chat-status">
			{live.tools.map((label, i) => (
				<div key={i} className="tool-line">
					{label}
				</div>
			))}
			<div className="state">
				{head}
				{sec === "" ? null : <span className="sec">{sec}</span>}
				{tail}
			</div>
		</div>
	);
}
