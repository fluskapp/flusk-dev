import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEventBus } from "../src/core/events.js";
import { zeroUsage } from "../src/core/types.js";
import { loadExtensions } from "../src/ext/load.js";
import { toolExtension, writeExtension } from "./ext-fixture.js";
import { runToolBatch, setupTestHome, teardownTestHome } from "./helpers.js";

describe("loadExtensions", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await setupTestHome("flusk-ext-loader-");
	});
	afterEach(() => teardownTestHome());

	it("loads a global extension and the agent can call the tool it registered", async () => {
		await writeExtension(
			"global",
			repo,
			"deploy.js",
			toolExtension("deploy", "deployed to staging"),
		);
		const load = await loadExtensions({ repoRoot: repo });

		expect(load.failures).toEqual([]);
		expect(load.extensions).toHaveLength(1);
		expect(load.extensions[0]).toMatchObject({
			name: "deploy",
			scope: "global",
			tools: ["deploy"],
			flows: [],
			events: [],
		});
		expect(load.extensions[0]?.error).toBeUndefined();
		expect(load.tools.map((t) => t.name)).toEqual(["deploy"]);

		const { agent, batches } = runToolBatch(repo, load.tools, [{ id: "c1", name: "deploy" }]);
		const { reason } = await agent.run();
		agent.session.close();
		expect(reason).toBe("completed");
		expect(batches[0]?.map((r) => [r.isError, r.output])).toEqual([[false, "deployed to staging"]]);
	});

	it("records the flows and events an extension registers, and wires the handlers", async () => {
		await writeExtension(
			"global",
			repo,
			"watcher.js",
			`export default (flusk) => {
				flusk.flow({ name: "ship" })
				flusk.flow({})
				flusk.on("run:end", (e) => flusk.log("saw " + e.reason))
			}`,
		);
		const lines: string[] = [];
		const events = createEventBus();
		const load = await loadExtensions({ repoRoot: repo, events, log: (l) => lines.push(l) });

		expect(load.extensions[0]).toMatchObject({
			flows: ["ship", "flow#2"],
			events: ["run:end"],
			tools: [],
		});
		await events.emit({
			type: "run:end",
			reason: "completed",
			stats: { turns: 1, usage: zeroUsage(), startedAt: new Date(0).toISOString() },
		});
		expect(lines).toEqual(["[watcher] saw completed"]);
	});

	it("isolates a throwing extension while its neighbour still loads", async () => {
		await writeExtension(
			"global",
			repo,
			"a-boom.js",
			`export default () => { throw new Error("boom in setup") }`,
		);
		await writeExtension("global", repo, "b-fine.js", toolExtension("fine", "ok"));
		const load = await loadExtensions({ repoRoot: repo });

		expect(load.extensions.map((e) => e.name)).toEqual(["a-boom", "b-fine"]);
		expect(load.extensions[0]?.error).toContain("boom in setup");
		expect(load.extensions[0]?.tools).toEqual([]);
		expect(load.extensions[1]?.error).toBeUndefined();
		expect(load.tools.map((t) => t.name)).toEqual(["fine"]);
		expect(load.failures).toHaveLength(1);
		expect(load.failures[0]?.source).toContain("a-boom.js");
	});

	it("drops the partial registrations of a setup that throws halfway", async () => {
		await writeExtension("global", repo, "a-whole.js", toolExtension("whole", "ok"));
		await writeExtension(
			"global",
			repo,
			"halfway.js",
			`export default (flusk) => {
				flusk.tool({ name: "early", description: "d", parameters: { type: "object" }, mode: "parallel", execute: async () => ({ output: "" }) })
				throw new Error("changed my mind")
			}`,
		);
		const load = await loadExtensions({ repoRoot: repo });
		expect(load.tools.map((t) => t.name)).toEqual(["whole"]);
		expect(load.extensions.find((e) => e.name === "halfway")?.tools).toEqual([]);
		expect(load.failures[0]?.error).toContain("changed my mind");
	});

	it("reports a syntactically broken file as a failure rather than crashing", async () => {
		await writeExtension("global", repo, "broken.js", "export default (flusk => {");
		await writeExtension("global", repo, "good.js", toolExtension("good", "ok"));
		const load = await loadExtensions({ repoRoot: repo });

		expect(load.failures).toHaveLength(1);
		expect(load.failures[0]?.source).toContain("broken.js");
		expect(load.extensions.find((e) => e.name === "broken")?.error).toBeTruthy();
		expect(load.tools.map((t) => t.name)).toEqual(["good"]);
	});

	it("rejects a file that does not default-export a function", async () => {
		await writeExtension("global", repo, "notafn.js", "export const setup = () => {}");
		const load = await loadExtensions({ repoRoot: repo });
		expect(load.extensions[0]?.error).toContain("default-export a setup function");
		expect(load.failures).toHaveLength(1);
	});

	it("loads nothing with the --no-extensions escape hatch", async () => {
		await writeExtension("global", repo, "deploy.js", toolExtension("deploy", "x"));
		const load = await loadExtensions({ repoRoot: repo, noExtensions: true });
		expect(load).toEqual({ extensions: [], tools: [], failures: [] });
	});

	it("is empty and quiet when no extension directory exists", async () => {
		const load = await loadExtensions({ repoRoot: repo });
		expect(load).toEqual({ extensions: [], tools: [], failures: [] });
	});
});
