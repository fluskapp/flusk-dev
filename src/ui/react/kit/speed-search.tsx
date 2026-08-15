/**
 * The visible half of speed search: the matched substring tinted with the
 * accent, and the dim corner flag naming the query and how much survived.
 */
import type { ReactNode } from "react";
import "./kit.css";

/** text, with the first case-insensitive occurrence of q marked. */
export function Hi({ text, q }: { text: string; q: string }): ReactNode {
	const at = q === "" ? -1 : text.toLowerCase().indexOf(q.toLowerCase());
	if (at < 0) return text;
	return (
		<>
			{text.slice(0, at)}
			<span className="ss-match">{text.slice(at, at + q.length)}</span>
			{text.slice(at + q.length)}
		</>
	);
}

/** What a narrowed list with nothing left says: the query, and the action
 * that widens it again — an empty state is never a bare void. */
export function NoMatch({ q, what, clear }: { q: string; what: string; clear: () => void }) {
	return (
		<>
			No {what} matches “{q}” —{" "}
			<span className="ev" onClick={clear}>
				clear
			</span>{" "}
			<span className="dim">(Esc)</span>
		</>
	);
}

/** The corner flag: a zero-height sticky strip, so it overlays the list
 * instead of pushing rows down the moment a search begins. */
export function SpeedFlag({ q, shown, total }: { q: string; shown: number; total: number }) {
	if (q === "") return null;
	return (
		<div className="ss-flag" aria-live="polite">
			<span>
				<span className="ss-q">{q}</span>
				{shown}/{total}
			</span>
		</div>
	);
}
