/**
 * Docs (client-docs.ts): the markdown flusk indexes across your projects as
 * a dense list, grouped by kind. The filter narrows live; project and kind
 * arrive as search params so the address bar names the view.
 */
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { Artifact } from "../../../features/docs/docs.functions.js";
import { fmtTime } from "../runs/format.js";
import { Line, Sec } from "../runs/widgets.js";
import "../runs/table.css";
import "../runs/widgets.css";
import "./docs.css";

const KIND_ORDER = ["context", "plan", "skill", "doc", "readme", "note"];
type Patch = Record<string, unknown>;

export interface DocsFilter {
	q?: string;
	project?: string;
	kind?: string;
}

function docMatches(a: Artifact, f: DocsFilter, filter: string): boolean {
	if (f.project !== undefined && a.project !== f.project) return false;
	if (f.kind !== undefined && a.kind !== f.kind) return false;
	if (filter === "") return true;
	return `${a.title} ${a.project} ${a.kind} ${a.path}`.toLowerCase().includes(filter);
}

function DocRow({ a }: { a: Artifact }) {
	const navigate = useNavigate();
	return (
		<tr
			data-open={`ref:${a.path}`}
			title={a.path}
			onClick={() =>
				navigate({
					to: "/docs/$",
					params: { _splat: a.path.replace(/^\//, "") },
					search: (prev: Patch) => prev,
				})
			}
		>
			<td>
				<span className={`kind k-${a.kind}`}>{a.kind}</span>
			</td>
			<td className="grow">{a.title}</td>
			<td>
				<span
					className="ev"
					onClick={(e) => {
						e.stopPropagation();
						navigate({ to: "/docs", search: (prev: Patch) => ({ ...prev, project: a.project }) });
					}}
				>
					{a.project}
				</span>
			</td>
			<td className="num">{fmtTime(new Date(a.mtimeMs).toISOString())}</td>
		</tr>
	);
}

export function DocsView({ docs, filter }: { docs: Artifact[]; filter: DocsFilter }) {
	const navigate = useNavigate();
	const [q, setQ] = useState(filter.q ?? "");
	if (docs.length === 0) {
		return (
			<div className="empty small">
				No markdown indexed.
				<br />
				Set <code>ui.projectDirs</code> in <code>~/.flusk/config.json</code>.
			</div>
		);
	}
	const shown = docs.filter((a) => docMatches(a, filter, q.toLowerCase()));
	const groups = new Map<string, Artifact[]>();
	for (const a of shown) groups.set(a.kind, [...(groups.get(a.kind) ?? []), a]);
	const kinds = KIND_ORDER.filter((k) => groups.has(k));
	return (
		<>
			<div className="head-row">
				<h2>{filter.project !== undefined ? `${filter.project} docs` : "Documents"}</h2>
				{filter.project !== undefined ? (
					<span
						className="ev"
						onClick={() =>
							navigate({ to: "/docs", search: (prev: Patch) => ({ ...prev, project: undefined }) })
						}
					>
						show all projects
					</span>
				) : null}
			</div>
			<input
				id="doc-search"
				placeholder="Filter documents"
				value={q}
				onChange={(e) => {
					setQ(e.target.value);
					// The URL names the filter, but replace: typing is not history.
					navigate({
						to: "/docs",
						search: (prev: Patch) => ({ ...prev, q: e.target.value || undefined }),
						replace: true,
					});
				}}
			/>
			{kinds.length === 0 ? (
				<Line>No document matches this filter.</Line>
			) : (
				kinds.map((k) => (
					<Sec key={k} title={k} count={groups.get(k)?.length ?? 0}>
						<table className="tbl">
							<tbody>
								{(groups.get(k) ?? []).map((a) => (
									<DocRow key={a.path} a={a} />
								))}
							</tbody>
						</table>
					</Sec>
				))
			)}
		</>
	);
}
