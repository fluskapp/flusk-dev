/**
 * The Specs list: every spec in the chosen repo, grouped by status in
 * lifecycle order. Typing with the list focused is the speed search; j/k
 * walk all groups as one list; Enter opens the cursor spec into ?spec= —
 * the address bar names the spec, the way it names the run.
 */
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { SpecMeta, SpecScan } from "../../../features/specs/spec.types.js";
import { Hi, NoMatch, SpeedFlag } from "../kit/speed-search.js";
import { composeKeys, useListNav } from "../kit/use-list-nav.js";
import { useSpeedSearch } from "../kit/use-speed-search.js";
import { fmtTime } from "../runs/format.js";
import { Line, Sec } from "../runs/widgets.js";
import { NewSpec } from "./NewSpec.js";
import { groupSpecs, specMatches, type RepoChoice, type SpecsFilter } from "./spec-rows.js";
import "../runs/table.css";
import "../runs/widgets.css";
import "./specs.css";

type Patch = Record<string, unknown>;
type Open = (s: SpecMeta, at: number) => void;

function SpecRow({ s, at, cursor, q, onOpen }: { s: SpecMeta; at: number; cursor: number; q: string; onOpen: Open }) {
	return (
		<tr
			data-open={`spec:${s.name}`}
			data-at={at}
			className={at === cursor ? "cursor" : ""}
			title={s.path}
			onClick={() => onOpen(s, at)}
		>
			<td className="grow">
				<Hi text={s.title} q={q} />
			</td>
			<td className="mono">
				<Hi text={s.name} q={q} />
			</td>
			<td>
				<span className="spec-mode">{s.mode}</span>
			</td>
			<td className="num" title="acceptance criteria">
				{s.acceptance.length === 0 ? <span className="off">0</span> : s.acceptance.length}
			</td>
			<td className="num">{fmtTime(s.updatedAt)}</td>
		</tr>
	);
}

export function SpecsView(props: {
	scan: SpecScan;
	repos: RepoChoice[];
	repo: string | null;
	filter: SpecsFilter;
}) {
	const { scan, repos, repo, filter } = props;
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const search = useSpeedSearch();
	const q = search.query;
	const patch = (p: Patch) => navigate({ to: "/specs", search: (prev: Patch) => ({ ...prev, ...p }) });
	const shown = scan.specs.filter((s) => specMatches(s, filter, q.toLowerCase()));
	const groups = groupSpecs(shown);
	const flat = groups.flatMap((g) => g.rows);
	const openSpec = (s: SpecMeta) => patch({ spec: s.name });
	const nav = useListNav(flat.length, (i) => {
		const s = flat[i];
		if (s !== undefined) openSpec(s);
	});
	const pick: Open = (s, at) => {
		nav.setCursor(at);
		openSpec(s);
	};
	const narrowed = filter.status !== undefined || filter.mode !== undefined;
	let base = 0;
	/* biome-ignore lint/a11y/noNoninteractiveTabindex: the list is the keyboard surface */
	return (
		<div className="knav" tabIndex={0} ref={nav.ref} onKeyDown={composeKeys(nav, search)}>
			<SpeedFlag q={q} shown={flat.length} total={scan.specs.length} />
			<div className="head-row">
				<h2>Specs</h2>
				{narrowed ? (
					<span className="ev" onClick={() => patch({ status: undefined, mode: undefined })}>
						show every status
					</span>
				) : (
					<span className="dim">what you intend · .flusk/specs</span>
				)}
				<div className="meta-actions">
					{repos.length > 1 ? (
						<select
							className="spec-repo"
							title="Which project's specs"
							value={repo ?? ""}
							onChange={(e) => patch({ repo: e.target.value, spec: undefined })}
						>
							{repos.map((r) => (
								<option key={r.path} value={r.path}>
									{r.name}
								</option>
							))}
						</select>
					) : null}
					<button type="button" className="act" onClick={() => setCreating((c) => !c)}>
						New spec
					</button>
				</div>
			</div>
			{(creating || scan.specs.length === 0) && repo !== null ? (
				<NewSpec repo={repo} onCreated={(name) => patch({ spec: name })} />
			) : null}
			{scan.specs.length === 0 ? (
				<div className="empty small">
					No specs yet — a spec is a markdown file in <code>.flusk/specs/</code> whose frontmatter
					names title, status, mode and the acceptance list.
					<br />
					Run <code>flusk spec new &lt;name&gt;</code>, or create one from a template right here.
				</div>
			) : groups.length === 0 ? (
				<Line>
					<NoMatch q={q} what="spec" clear={search.clear} />
				</Line>
			) : (
				groups.map((g) => {
					const from = base;
					base += g.rows.length;
					return (
						<Sec key={g.status} title={g.status} count={g.rows.length}>
							<table className="tbl">
								<tbody>
									{g.rows.map((s, i) => (
										<SpecRow key={s.name} s={s} at={from + i} cursor={nav.cursor} q={q} onOpen={pick} />
									))}
								</tbody>
							</table>
						</Sec>
					);
				})
			)}
			{/* An unreadable spec must not vanish: the scan says why it refused. */}
			{scan.skipped.map((k) => (
				<div className="line" key={k.path}>
					skipped: {k.path} — {k.why}
				</div>
			))}
		</div>
	);
}
