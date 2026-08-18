/**
 * The effective working directory for a chat send. The code capture's project
 * wins (the talk is ABOUT that tree); otherwise the project the router is
 * looking at. Never a silent fallback — "" means none, and the composer says
 * so out loud while the engine refuses a CLI spawn without one.
 */
import { cwdPath } from "./attach-logic.js";
import { AT } from "./attach-store.js";

/** The project the router is looking at: /projects/$project param, else the
 *  ?project= search param the Runs/Docs routes carry, else null. */
export function routeProject(state: { matches: Array<{ params: unknown; search: unknown }> }): string | null {
	for (const m of state.matches) {
		const p = (m.params as { project?: unknown } | null | undefined)?.project;
		if (typeof p === "string" && p !== "") return p;
	}
	for (const m of state.matches) {
		const s = (m.search as { project?: unknown } | null | undefined)?.project;
		if (typeof s === "string" && s !== "") return s;
	}
	return null;
}

/** Effective chat cwd: the code capture's project first, else the route's
 *  active project, resolved via AT.projects. "" = none. */
export function effectiveCwd(route: string | null): string {
	const captured = cwdPath();
	if (captured !== "") return captured;
	if (route === null) return "";
	return (AT.projects ?? []).find((p) => p.name === route)?.path ?? "";
}
