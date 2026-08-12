/**
 * AgentSpec.tools narrowing.
 *
 * The list is an ALLOW-list and it can only subtract. It is intersected with
 * the tools the parent run already has, so a spec — including one authored by
 * a cloned repo — can never hand itself a tool the policy withheld: naming
 * "bash" in a run that has no bash tool yields nothing, not bash.
 *
 * The three states are distinct and all meaningful:
 *   undefined -> the caller's default set (the spec expresses no opinion)
 *   []        -> no tools at all (a read-only reasoner)
 *   [names]   -> that subset, in the caller's order
 */
import type { Tool } from "../tools/tool.js";

export function allowedTools(available: Tool[], allow: string[] | undefined): Tool[] {
	if (allow === undefined) return available;
	const wanted = new Set(allow);
	return available.filter((tool) => wanted.has(tool.name));
}

/** Names a spec asked for that the run does not have — worth saying, never fatal. */
export function unknownTools(available: Tool[], allow: string[] | undefined): string[] {
	if (allow === undefined) return [];
	const have = new Set(available.map((tool) => tool.name));
	return [...new Set(allow)].filter((name) => !have.has(name)).sort();
}
