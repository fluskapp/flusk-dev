/**
 * The tree's row model: which rows are visible given the query and the
 * expansion state, flattened so the keyboard cursor (j/k) can walk them.
 * Split from the rail so the rules stay testable apart from rendering.
 */
import type { ProjectSummary } from "../../../features/projects/projects.functions.js";
import { firstQuietIndex, orderProjects } from "./tree-order.js";

export type ChildLabel = "Runs" | "Docs" | "Config";

export type VisRow =
	| { kind: "project"; p: ProjectSummary; open: boolean; sepBefore: number | null }
	| { kind: "child"; label: ChildLabel; parent: string; count: number | null };

export function projMatches(p: ProjectSummary, query: string): boolean {
	if (query === "") return true;
	return `${p.name} ${p.path} ${p.kind}`.toLowerCase().includes(query);
}

export function treeRows(
	projects: ProjectSummary[],
	query: string,
	expanded: Record<string, boolean>,
): VisRow[] {
	const shown = orderProjects(projects.filter((p) => projMatches(p, query)));
	const firstQuiet = firstQuietIndex(shown);
	const rows: VisRow[] = [];
	shown.forEach((p, i) => {
		const open = expanded[p.name] === true;
		rows.push({
			kind: "project",
			p,
			open,
			// The divider names how many rows sit under it, like the legacy label.
			sepBefore: i === firstQuiet && i > 0 ? shown.length - firstQuiet : null,
		});
		if (!open) return;
		rows.push({ kind: "child", label: "Runs", parent: p.name, count: p.runs });
		rows.push({ kind: "child", label: "Docs", parent: p.name, count: p.docs });
		rows.push({ kind: "child", label: "Config", parent: p.name, count: null });
	});
	return rows;
}
