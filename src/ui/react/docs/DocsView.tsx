/**
 * Docs (client-docs.ts): the markdown flusk indexes across your projects as
 * a dense list, grouped by kind. The filter field is the visible face of
 * the list's speed search — typing with the list focused and typing in the
 * field feed the same query, which travels as ?q= so the address bar names
 * the view. j/k walk every group as one list; Enter opens the cursor row.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { Artifact } from "../../../features/docs/docs.functions.js";
import { Hi, NoMatch, SpeedFlag } from "../kit/speed-search.js";
import { composeKeys, faceKeys, useListNav } from "../kit/use-list-nav.js";
import { useSpeedSearch } from "../kit/use-speed-search.js";
import { fmtTime } from "../runs/format.js";
import { Line, ProjectCell, Sec } from "../runs/widgets.js";
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

type Open = (a: Artifact, at: number) => void;

function DocRow({ a, at, cursor, q, onOpen }: { a: Artifact; at: number; cursor: number; q: string; onOpen: Open }) {
	return (
		<tr
			data-open={`ref:${a.path}`}
			data-at={at}
			className={at === cursor ? "cursor" : ""}
			title={a.path}
			onClick={() => onOpen(a, at)}
		>
			<td>
				<span className={`kind k-${a.kind}`}>{a.kind}</span>
			</td>
			<td className="grow">
				<Hi text={a.title} q={q} />
			</td>
			<td>
				<ProjectCell name={a.project} />
			</td>
			<td className="num">{fmtTime(new Date(a.mtimeMs).toISOString())}</td>
		</tr>
	);
}

export function DocsView({ docs, filter }: { docs: Artifact[]; filter: DocsFilter }) {
	const navigate = useNavigate();
	const search = useSpeedSearch(filter.q ?? "");
	const q = search.query;
	/* The URL names the filter, but replace: typing is not history. */
	useEffect(() => {
		navigate({ to: "/docs", search: (prev: Patch) => ({ ...prev, q: q === "" ? undefined : q }), replace: true });
	}, [q, navigate]);
	const shown = docs.filter((a) => docMatches(a, filter, q.toLowerCase()));
	const groups = new Map<string, Artifact[]>();
	for (const a of shown) groups.set(a.kind, [...(groups.get(a.kind) ?? []), a]);
	const kinds = KIND_ORDER.filter((k) => groups.has(k));
	const flat = kinds.flatMap((k) => groups.get(k) ?? []);
	const openDoc = (a: Artifact) =>
		navigate({
			to: "/read/$",
			params: { _splat: a.path.replace(/^\//, "") },
			search: (prev: Patch) => prev,
		});
	const nav = useListNav(flat.length, (i) => {
		const a = flat[i];
		if (a !== undefined) openDoc(a);
	});
	const pick = (d: Artifact, at: number) => {
		nav.setCursor(at);
		openDoc(d);
	};
	if (docs.length === 0) {
		return (
			<div className="empty small">
				No markdown indexed.
				<br />
				Set <code>ui.projectDirs</code> in <code>~/.flusk/config.json</code>.
			</div>
		);
	}
	let base = 0;
	/* biome-ignore lint/a11y/noNoninteractiveTabindex: the list is the keyboard surface */
	return (
		<div className="knav" tabIndex={0} ref={nav.ref} onKeyDown={composeKeys(nav, search)}>
			<SpeedFlag q={q} shown={flat.length} total={docs.length} />
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
				spellCheck={false}
				value={q}
				onChange={(e) => search.setQuery(e.target.value)}
				onKeyDown={faceKeys(search, nav)}
			/>
			{kinds.length === 0 ? (
				<Line>
					<NoMatch q={q} what="document" clear={search.clear} />
				</Line>
			) : (
				kinds.map((k) => {
					const rows = groups.get(k) ?? [];
					const from = base;
					base += rows.length;
					return (
						<Sec key={k} title={k} count={rows.length}>
							<table className="tbl">
								<tbody>
									{rows.map((a, i) => (
										<DocRow key={a.path} a={a} at={from + i} cursor={nav.cursor} q={q} onOpen={pick} />
									))}
								</tbody>
							</table>
						</Sec>
					);
				})
			)}
		</div>
	);
}
