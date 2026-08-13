/**
 * The Documentation window's fact rows, ported from client-doc-rows.ts. Two
 * rules hold: every section renders something (a blank box reads as a broken
 * panel), and every row made CLICKABLE must be openable — a .d.ts under
 * node_modules cannot be served, so its row is inert rather than a promise
 * the workbench cannot keep.
 */
import { useNavigate } from "@tanstack/react-router";
import { Fragment } from "react";
import type { DocTag, SourceLoc, SymbolDoc } from "../../../features/docs/lsp.functions.js";
import { base } from "./use-doc.js";

/** A titled block. The title is a literal from this file, never user data. */
export function DocSec({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="dw-sec">
			<h4>{title}</h4>
			{children}
		</section>
	);
}

/** @param / @returns and friends, as a compact definition table. */
export function TagsSec({ tags }: { tags: DocTag[] }) {
	if (tags.length === 0) return null;
	return (
		<DocSec title="Parameters and returns">
			<div className="dw-tags">
				{tags.map((t, i) => (
					<Fragment key={i}>
						<div className="dw-k">{t.name}</div>
						<div className="dw-v">{t.text}</div>
					</Fragment>
				))}
			</div>
		</DocSec>
	);
}

/** One file:line. Clickable only when the server said it can serve the file. */
export function LocRow({ loc, openable }: { loc: SourceLoc; openable: boolean }) {
	const navigate = useNavigate();
	const go = (): void => {
		// openFile's React home is the /files/$ route; the line travels in search.
		void navigate({ to: `/files${loc.file}`, search: { line: loc.line } } as never);
	};
	return (
		<div
			className={openable ? "dw-row" : "dw-row dw-inert"}
			title={loc.file}
			data-doc={openable ? `loc:${loc.line}` : undefined}
			data-path={openable ? loc.file : undefined}
			onClick={openable ? go : undefined}
		>
			<span className="dw-t">{base(loc.file)}</span>
			<span className="dw-loc">
				{loc.line}:{loc.col}
			</span>
			{openable ? null : <span className="dw-why">declaration file, outside the indexed sources</span>}
		</div>
	);
}

/**
 * The count is the true total; the rows are the first few. The act row is a
 * literal, case-sensitive search over the projects — named for what it DOES,
 * not "usages", because the engine's exact list sits two rows above it.
 */
export function UsagesSec({ doc, openable }: { doc: SymbolDoc; openable: string[] | null }) {
	const navigate = useNavigate();
	const refs = doc.references;
	const n = doc.referenceCount ?? refs.length;
	const can = (f: string): boolean => openable === null || openable.includes(f);
	return (
		<DocSec title="Usages">
			<div className="dw-count">
				{n} usage{n === 1 ? "" : "s"}
				{doc.truncated === true ? ` · first ${refs.length} shown` : ""}
			</div>
			{refs.length === 0 ? (
				<div className="dw-none">no usages in the indexed sources</div>
			) : (
				refs.slice(0, 5).map((r, i) => <LocRow key={i} loc={r} openable={can(r.file)} />)
			)}
			<div
				className="dw-row dw-act"
				data-doc={`usages:${doc.name}`}
				onClick={() => void navigate({ to: "/find", search: { q: doc.name } } as never)}
			>
				Search files for {doc.name} (⌥F7)
			</div>
		</DocSec>
	);
}
