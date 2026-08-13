/**
 * Tool window 1: the Projects rail (client-tree.ts). A project is the unit
 * of attention, so the tree is projects — harnesses and repos — each
 * expanding to Runs / Docs / Config. The rail owns its own data: it polls
 * the project scan and only re-renders when the payload actually changed.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getProjects, type ProjectSummary } from "../../../features/projects/projects.functions.js";
import { treeRows, type VisRow } from "./tree-model.js";
import { TreeRowView } from "./TreeRows.js";
import { useTreeKeys } from "./use-tree-keys.js";
import "./tree.css";

const POLL_MS = 5000;
type Patch = Record<string, unknown>;

export function ProjectsRail() {
	const navigate = useNavigate();
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [active, setActive] = useState<string | null>(null);
	const [cursor, setCursor] = useState(0);
	const searchRef = useRef<HTMLInputElement>(null);
	const lastJson = useRef("");

	useEffect(() => {
		let alive = true;
		const load = async () => {
			try {
				const list = (await getProjects()) as ProjectSummary[];
				const json = JSON.stringify(list);
				if (!alive || json === lastJson.current) return;
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

	const rows = treeRows(projects, query.toLowerCase(), expanded);
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
	useTreeKeys(searchRef, rows, cursor, setCursor, open);

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
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
			<div id="tree">
				{rows.length > 0 ? (
					rows.map((row, i) => (
						<TreeRowView
							key={row.kind === "project" ? row.p.name : `${row.parent}:${row.label}`}
							row={row}
							at={i}
							cursor={cursor}
							active={active}
							act={{ open, toggle }}
						/>
					))
				) : query !== "" ? (
					<div className="empty small">No project matches “{query}”</div>
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
