/**
 * RELATED — the half a language service has no idea about: the commits, runs,
 * sessions and docs that already touched this symbol, each carrying the `why`
 * clause that earned it its row. Ported from client-doc-rows.ts.
 *
 * The legacy rows clicked through to the palette's history card and openRef;
 * neither surface exists in the React workbench yet, so a click degrades to
 * the legacy fallback for an unknown sha: the ref is copied to the clipboard.
 * The data-doc vocabulary is kept so the richer verbs can land later.
 */
import type { Related, RelatedItem } from "../../../features/docs/lsp.functions.js";
import { DocSec } from "./doc-rows.js";

const DOC_GROUPS: [keyof Related & ("commits" | "runs" | "docs"), string][] = [
	["commits", "Commits"],
	["runs", "Runs and sessions"],
	["docs", "Docs and skills"],
];

function copyRef(ref: string): void {
	try {
		void navigator.clipboard.writeText(ref);
	} catch {
		/* clipboard unavailable */
	}
}

/** A commit has no tab of its own; every kind currently degrades to a copy. */
function RelRow({ it }: { it: RelatedItem }) {
	return (
		<div
			className="dw-row"
			data-doc={`${it.kind === "commit" ? "commit" : "ref"}:${it.ref}`}
			data-title={it.title}
			title={it.ref}
			onClick={() => copyRef(it.ref)}
		>
			<span className="glyph">{it.kind}</span>
			<span className="dw-t">{it.title}</span>
			<span className="dw-why">{it.why}</span>
			{it.at !== "" ? <span className="dw-at">{it.at.slice(0, 10)}</span> : null}
		</div>
	);
}

export function RelatedSec({ related, note }: { related: Related | null; note?: string }) {
	if (related === null) {
		return (
			<DocSec title="Related">
				<div className="dw-none">{note ?? "related history is unavailable"}</div>
			</DocSec>
		);
	}
	const groups = DOC_GROUPS.map(([key, label]) => {
		const items = related[key];
		if (items.length === 0) return null;
		return (
			<div key={key}>
				<h5 className="dw-sub">{label}</h5>
				{items.map((it, i) => (
					<RelRow key={i} it={it} />
				))}
			</div>
		);
	}).filter((g) => g !== null);
	const mentions = related.mentions;
	return (
		<DocSec title="Related">
			{groups.length === 0 ? (
				<div className="dw-none">nothing in the history index mentions this symbol yet</div>
			) : (
				groups
			)}
			<div className="dw-note">
				{mentions} literal mention{mentions === 1 ? "" : "s"} across your projects
				{related.note !== undefined ? ` · ${related.note}` : ""}
			</div>
		</DocSec>
	);
}
