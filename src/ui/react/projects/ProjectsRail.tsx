/**
 * Tool window 1: the Projects rail (client-tree.ts). A project is the unit
 * of attention, so the tree is projects — harnesses and repos — each
 * expanding to Runs / Docs / Config. The rail owns its own data: it polls
 * the project scan and only re-renders when the payload actually changed.
 *
 * The #search field is the visible face of the tree's speed search: typing
 * with the tree focused and typing in the field feed the same query.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getProjects, type ProjectSummary } from "../../../features/projects/projects.functions.js";
import { NoMatch, SpeedFlag } from "../kit/speed-search.js";
import { composeKeys, faceKeys, useListNav } from "../kit/use-list-nav.js";
import { useSpeedSearch } from "../kit/use-speed-search.js";
import { treeRows, type VisRow } from "./tree-model.js";
import { TreeRowView } from "./TreeRows.js";
import { treeArrowKey, useTreeKeys } from "./use-tree-keys.js";
import "./tree.css";

const POLL_MS = 5000;
type Patch = Record<string, unknown>;

/** `initial` is the root loader's already-scanned rows: the tree paints
 * populated in the SSR HTML, and the poll below is a refresh, not the fill. */
export function ProjectsRail({ initial }: { initial?: ProjectSummary[] }) {
	const navigate = useNavigate();
	const [projects, setProjects] = useState<ProjectSummary[]>(initial ?? []);
	const [loaded, setLoaded] = useState(initial !== undefined);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [active, setActive] = useState<string | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const lastJson = useRef(initial === undefined ? "" : JSON.stringify(initial));

	useEffect(() => {
		let alive = true;
		const load = async () => {
			try {
				const list = (await getProjects()) as ProjectSummary[];
				const json = JSON.stringify(list);
				if (!alive) return;
				setLoaded(true);
				if (json === lastJson.current) return;
				lastJson.current = json;
				setProjects(list);
			} catch {
				/* server unreachable: keep the last tree rather than blanking it */
			}
		};
		load();
		const t = setInterval(load, POLL_MS);
		return () => {
			alive = false;
			clearInterval(t);
		};
	}, []);

	const search = useSpeedSearch();
	const rows = treeRows(projects, search.query.toLowerCase(), expanded);
	const toggle = (name: string) => setExpanded((e) => ({ ...e, [name]: e[name] !== true }));
	const open = (row: VisRow) => {
		if (row.kind === "project" || row.label === "Config") {
			const name = row.kind === "project" ? row.p.name : row.parent;
			if (row.kind === "project") {
				setActive(name);
				setExpanded((e) => ({ ...e, [name]: true }));
			}
			navigate({ to: "/projects/$project", params: { project: name }, search: (p: Patch) => p });
			return;
		}
		navigate({
			to: row.label === "Runs" ? "/runs" : "/docs",
			search: (prev: Patch) => ({ ...prev, project: row.parent }),
		});
	};
	const nav = useListNav(rows.length, (i) => {
		const row = rows[i];
		if (row !== undefined) open(row);
	});
	useTreeKeys(searchRef, nav, search);
	const onKeyDown = (e: React.KeyboardEvent) => {
		if (treeArrowKey(rows, nav, toggle, e)) return;
		composeKeys(nav, search)(e);
	};
	const shownProjects = rows.filter((r) => r.kind === "project").length;

	return (
		<aside id="side">
			<div className="tw-head">
				<span className="tw-num">1</span>
				<span>Projects</span>
			</div>
			<input
				id="search"
				ref={searchRef}
				placeholder="Search (/)  project, path, kind"
				spellCheck={false}
				value={search.query}
				onChange={(e) => search.setQuery(e.target.value)}
				onKeyDown={faceKeys(search, nav)}
			/>
			{/* biome-ignore lint/a11y/noNoninteractiveTabindex: the tree is the keyboard surface */}
			<div id="tree" className="knav" role="tree" aria-label="Projects" tabIndex={0} ref={nav.ref} onKeyDown={onKeyDown}>
				<SpeedFlag q={search.query} shown={shownProjects} total={projects.length} />
				{rows.length > 0 ? (
					rows.map((row, i) => (
						<TreeRowView
							key={row.kind === "project" ? row.p.name : `${row.parent}:${row.label}`}
							row={row}
							at={i}
							cursor={nav.cursor}
							active={active}
							q={search.query}
							act={{ open, toggle }}
						/>
					))
				) : !loaded ? (
					<div className="empty small">Scanning projects…</div>
				) : search.query !== "" ? (
					<div className="empty small">
						<NoMatch q={search.query} what="project" clear={search.clear} />
					</div>
				) : (
					<div className="empty small">
						No projects indexed.
						<br />
						Set <code>ui.projectDirs</code> in <code>~/.flusk/config.json</code>.
					</div>
				)}
			</div>
		</aside>
	);
}
