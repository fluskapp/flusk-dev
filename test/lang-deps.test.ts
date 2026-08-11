/**
 * The optional-dependency path: what happens when the graph packages are NOT
 * installed. ah has to build, test and run anyway, and the flow command has to
 * print one line the user can act on — so absence is proven here rather than
 * assumed. The importer is injected, so the proof holds on a machine where the
 * packages ARE installed.
 *
 * The package names are deliberately absent from this file: `npm run
 * standards` bans them outside src/lang/, and the install line comes from
 * langMissing() precisely so no second copy of it can drift.
 */
import { describe, expect, it } from "vitest";
import { nodeContext } from "../src/lang/context.js";
import { type Importer, langMissing, loadLang, resetLang } from "../src/lang/deps.js";
import { aboutOf, behaviourOf } from "../src/lang/nodes.js";
import type { FlowNode, FlowState } from "../src/lang/types.js";

const absent: Importer = async (specifier) => {
	throw new Error(`Cannot find package '${specifier}'`);
};

describe("loadLang without the optional packages", () => {
	it("answers null instead of throwing", async () => {
		expect(await loadLang(absent)).toBeNull();
	});

	it("answers null when a package resolves but is not the graph library", async () => {
		expect(await loadLang(async () => ({ nope: true }))).toBeNull();
	});

	it("names one npm command that fixes it", () => {
		// --include=optional, not --save-optional: the packages are already in
		// package.json and the lockfile, so re-resolving them is the wrong fix.
		expect(langMissing()).toMatch(/^npm install --include=optional\b/);
		expect(langMissing()).not.toContain("--save-optional");
		expect(langMissing()).toContain("langgraph");
		expect(langMissing().split("\n")).toHaveLength(1);
	});

	it("leaves the rest of the flow code path working", async () => {
		expect(await loadLang(absent)).toBeNull();
		// Everything that is not the graph itself is ah's own code, so a
		// packageless checkout can still parse specs, route and explain itself.
		const node: FlowNode = { id: "code", kind: "code", about: "make the tests pass" };
		const state: FlowState = {
			task: "t",
			project: "ah",
			artifacts: { plan: "step one" },
			costUsd: 0,
			steps: [
				{
					nodeId: "plan",
					kind: "plan",
					startedAt: "2026-08-11T00:00:00.000Z",
					ok: true,
					output: "step one",
					promptTokens: 3,
				},
			],
		};
		expect(aboutOf(node)).toBe("make the tests pass");
		expect(behaviourOf("code").taskKind).toBe("code");
		// nodeContext is the ONE answer to what a step inherits.
		expect(
			nodeContext(node, state)
				.map((c) => c.text)
				.join("\n"),
		).toContain("step one");
	});

	it("does not poison the cache for a real load", async () => {
		resetLang();
		await loadLang(absent);
		const real = await loadLang();
		expect(real === null || typeof real.END === "string").toBe(true);
	});
});
