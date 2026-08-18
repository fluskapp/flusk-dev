/**
 * The Specs window's pure half and the toolbar IA, held against
 * docs/experience.md: the numbers mean what the document says, Flows and
 * Ask are windows no longer, grouping walks the lifecycle in order, and
 * the task a run serves IS the spec.
 */
import { describe, expect, it } from "vitest";
import type { SpecMeta } from "../src/features/specs/spec.types.js";
import { HELP_GROUPS } from "../src/ui/react/palette/help-groups.js";
import {
	composeTask,
	groupSpecs,
	specMatches,
	STATUS_ORDER,
} from "../src/ui/react/specs/spec-rows.js";
import { PANELS } from "../src/ui/react/workbench/Toolbar.js";

const meta = (over: Partial<SpecMeta>): SpecMeta => ({
	name: "retry-hook",
	title: "Ship the retry hook",
	status: "draft",
	mode: "build",
	acceptance: ["retries with backoff"],
	path: ".flusk/specs/retry-hook.md",
	updatedAt: "2026-08-01T00:00:00Z",
	...over,
});

describe("toolbar IA", () => {
	it("numbers the windows exactly as the experience document does", () => {
		const byN = Object.fromEntries(PANELS.map((p) => [p.n, p.label]));
		expect(byN).toEqual({
			"1": "Projects",
			"2": "Specs",
			"3": "Runs",
			"4": "Find",
			"5": "Chat",
			"6": "Docs",
			"7": "Graph",
			"8": "Web",
			"9": "Documentation",
			"0": "Harness",
		});
	});
	it("has no Flows or Ask button and binds 0 to Harness", () => {
		expect(PANELS.some((p) => /flow|ask/i.test(p.label))).toBe(false);
		expect(PANELS.find((p) => p.n === "0")?.to).toBe("/harness");
	});
	it("routes 2 to /specs and keeps the doc window a toggle on 9", () => {
		expect(PANELS.find((p) => p.n === "2")?.to).toBe("/specs");
		expect(PANELS.find((p) => p.n === "9")?.toggles).toBe("doc");
	});
});

describe("help sheet", () => {
	const rows = HELP_GROUPS.flatMap((g) => g.rows);
	it("never mentions Ask and carries the new numbers", () => {
		expect(rows.some(([, v]) => /ask ai/i.test(v))).toBe(false);
		const tw = HELP_GROUPS.find((g) => g.id === "help-tw");
		expect(tw?.rows).toContainEqual(["2", "Specs (⌘2)"]);
		expect(tw?.rows).toContainEqual(["7", "Graph (⌘7)"]);
		expect(tw?.rows).toContainEqual(["9", "Documentation (⌘9)"]);
	});
	it("says when to use what, one sentence per window", () => {
		const when = HELP_GROUPS.find((g) => g.id === "help-when");
		expect(when?.rows.map(([k]) => k)).toEqual([
			"Projects", "Specs", "Runs", "Find", "Chat", "Docs", "Graph", "Web", "Documentation",
		]);
	});
});

describe("spec rows", () => {
	it("groups by status in lifecycle order and drops empty sections", () => {
		const groups = groupSpecs([
			meta({ name: "c", status: "done" }),
			meta({ name: "a", status: "draft" }),
			meta({ name: "b", status: "building" }),
		]);
		expect(groups.map((g) => g.status)).toEqual(["draft", "building", "done"]);
		expect(STATUS_ORDER).toEqual(["draft", "planned", "building", "verifying", "done"]);
	});
	it("filters by status, mode and query", () => {
		const s = meta({});
		expect(specMatches(s, {}, "")).toBe(true);
		expect(specMatches(s, { status: "done" }, "")).toBe(false);
		expect(specMatches(s, { mode: "plan" }, "")).toBe(false);
		expect(specMatches(s, {}, "retry")).toBe(true);
		expect(specMatches(s, {}, "nope")).toBe(false);
	});
	it("composes the run task as title, blank line, body verbatim", () => {
		const task = composeTask({ ...meta({}), body: "Context.\n\n- sketch\n" });
		expect(task).toBe("Ship the retry hook\n\nContext.\n\n- sketch\n");
	});
});
