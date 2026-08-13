/**
 * How the palette paints its hits: one dense row, history grouped by kind
 * with the query's terms marked, Go-to-File rows with the matched
 * subsequence marked — so it is obvious WHY a result is a result. JSX
 * replaces the escape-then-mark dance: marking happens on the RAW string and
 * the pieces render as nodes, so a term can never eat an entity.
 */
import type { ReactNode } from "react";
import type { GotoHit } from "../../../features/search/goto.functions.js";
import { fileGlyph } from "../files/path-bits.js";
import { DOT, type HistoryHit } from "./palette-state.js";

export function PalMark({ text, terms }: { text: string; terms?: string[] }) {
	let raw = String(text ?? "");
	(terms ?? []).forEach((t) => {
		const word = String(t).replace(/[^a-z0-9_]/gi, "");
		if (word.length > 1) raw = raw.replace(new RegExp(`(${word})`, "gi"), "\u0001$1\u0002");
	});
	const out: ReactNode[] = [];
	raw.split("\u0001").forEach((chunk, i) => {
		if (i === 0) {
			out.push(chunk);
			return;
		}
		const at = chunk.indexOf("\u0002");
		out.push(<mark key={i}>{chunk.slice(0, at)}</mark>, chunk.slice(at + 1));
	});
	return <>{out}</>;
}

/** Mark the subsequence the fuzzy matcher would have consumed, greedily. */
export function GoMark({ path, q }: { path: string; q: string }) {
	const needle = String(q ?? "").replace(/\s+/g, "").toLowerCase();
	const lower = String(path).toLowerCase();
	const out: ReactNode[] = [];
	let qi = 0;
	for (let i = 0; i < path.length; i++) {
		const hit = qi < needle.length && lower.charAt(i) === needle.charAt(qi);
		if (hit) qi++;
		out.push(hit ? <mark key={i}>{path.charAt(i)}</mark> : path.charAt(i));
	}
	return <>{out}</>;
}

interface HistoryProps {
	hits: HistoryHit[];
	q: string;
	cur: number;
	onPick: (i: number) => void;
}

/** Grouping is presentation: the cursor already sits on the ranker's answer. */
export function HistoryList({ hits, q, cur, onPick }: HistoryProps) {
	if (hits.length === 0) {
		return (
			<div className="pal-empty">
				{q !== "" ? `No matches for ${q}` : "Type to search everything that already happened"}
			</div>
		);
	}
	let last = "";
	return (
		<>
			{hits.map((h, i) => {
				const group = h.card.kind !== last;
				last = h.card.kind;
				return (
					<span key={i} style={{ display: "contents" }}>
						{group ? <div className="pal-group">{h.card.kind}s</div> : null}
						<div className={`pal-row${i === cur ? " on" : ""}`} data-i={i} onClick={() => onPick(i)}>
							<span className="glyph">{h.card.kind}</span>
							<span className="pal-title">
								<PalMark text={h.card.title} terms={h.terms} />
							</span>
							<span className="pal-meta">{h.card.project + DOT + h.card.at.slice(0, 10)}</span>
						</div>
					</span>
				);
			})}
		</>
	);
}

interface FilesProps {
	hits: GotoHit[];
	q: string;
	cur: number;
	onPick: (i: number) => void;
}

export function FilesList({ hits, q, cur, onPick }: FilesProps) {
	if (hits.length === 0) {
		return (
			<div className="pal-empty">
				{q !== ""
					? `No path matches ${q}`
					: "Type part of a path — “uicli” finds src/ui/client-list.ts"}
			</div>
		);
	}
	return (
		<>
			{hits.map((h, i) => (
				<div key={i} className={`pal-row${i === cur ? " on" : ""}`} data-i={i} onClick={() => onPick(i)}>
					<span className="glyph">{fileGlyph(h.path)}</span>
					<span className="pal-path">
						<GoMark path={h.path} q={q} />
					</span>
					<span className="pal-meta">{h.project || ""}</span>
				</div>
			))}
		</>
	);
}
