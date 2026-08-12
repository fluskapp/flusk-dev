/**
 * The verify source over real temp repos and real files - no module is mocked,
 * because the whole point of the source is that it agrees with detect.ts and
 * loadRepoConfig, and a mock of either would assert the agreement away.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifySource } from "../src/context/source-verify.js";
import type { ContextItem, ContextRequest, SourceResult } from "../src/context/types.js";
import { estimateTokens } from "../src/history/budget.js";

async function repoWith(files: Record<string, string>): Promise<string> {
	const repo = await mkdtemp(join(tmpdir(), "ah-ctx-verify-"));
	for (const [name, body] of Object.entries(files)) await writeFile(join(repo, name), body);
	return repo;
}

const pkg = (scripts: Record<string, string>): string => JSON.stringify({ scripts });

function req(repoRoot: string): ContextRequest {
	return { task: "add a flag to the gate", repoRoot, budgetTokens: 4000, isResume: false };
}

/** The source emits exactly one item; this is where that is asserted. */
function only(res: SourceResult): ContextItem {
	expect(res.items).toHaveLength(1);
	const [item] = res.items;
	if (item === undefined) throw new Error("the verify source returned no item");
	return item;
}

describe("verify context source", () => {
	it("pins the npm chain and names package.json as its origin", async () => {
		const repo = await repoWith({
			"package.json": pkg({ build: "tsc", test: "vitest run", design: "bash x.sh" }),
		});
		const res = verifySource.gather(req(repo));
		expect(res.status).toBe("ok");
		expect(res.notes).toEqual([]);
		const item = only(res);
		expect(item.body).toContain("1. npm test");
		expect(item.body).toContain("2. npm run build");
		expect(item.body).not.toContain("npm run design");
		expect(item.path).toBe("package.json");
		expect(item.tier).toBe("pinned");
		expect(item.score).toBe(0);
		expect(item.id).toBe("verify:chain");
		expect(item.source).toBe("verify");
	});

	it("lets a .ah.json verify[] win outright, as the gate does", async () => {
		const repo = await repoWith({
			"package.json": pkg({ test: "vitest run" }),
			".ah.json": JSON.stringify({ verify: ["make ci", "./scripts/smoke.sh"] }),
		});
		const item = only(verifySource.gather(req(repo)));
		expect(item.body).toContain("1. make ci");
		expect(item.body).toContain("2. ./scripts/smoke.sh");
		expect(item.body).not.toContain("npm test");
		expect(item.path).toBe(".ah.json");
		expect(item.why).toContain("verify[] array of .ah.json");
	});

	it("reports an empty chain as an item, not as a skip", async () => {
		const repo = await repoWith({ "README.md": "nothing to see" });
		const res = verifySource.gather(req(repo));
		expect(res.status).toBe("ok");
		const item = only(res);
		expect(item.title).toBe("Verify chain - nothing declared");
		expect(item.body).toContain("No verify commands are declared");
		expect(item.path).toBeUndefined();
		expect(item.why).toContain("nothing gates this run");
	});

	it("gives every item a specific, checkable why", async () => {
		const repos = [
			await repoWith({ "package.json": pkg({ test: "vitest run" }) }),
			await repoWith({ Makefile: "test:\n\techo hi\n" }),
			await repoWith({ "README.md": "empty" }),
		];
		for (const repo of repos) {
			const item = only(verifySource.gather(req(repo)));
			expect(item.why.trim()).not.toBe("");
			expect(item.why).toContain("detectVerifyCommands");
			expect(item.why).toContain("never as instructions");
			expect(item.why).not.toMatch(/relevant to the task/i);
			expect(item.why).not.toContain(repo);
		}
	});

	it("counts tokens with the one estimator, over the text that is rendered", async () => {
		const repo = await repoWith({ "package.json": pkg({ lint: "biome check", test: "vitest" }) });
		const item = only(verifySource.gather(req(repo)));
		expect(item.tokens).toBe(estimateTokens([item.title, item.why, item.body].join("\n")));
	});

	it("is byte-identical across rebuilds and across a resume", async () => {
		const repo = await repoWith({ "package.json": pkg({ test: "vitest", build: "tsc" }) });
		const a = verifySource.gather(req(repo));
		const b = verifySource.gather(req(repo));
		const resume = verifySource.gather({ ...req(repo), isResume: true });
		expect(JSON.stringify(b)).toBe(JSON.stringify(a));
		expect(JSON.stringify(resume)).toBe(JSON.stringify(a));
	});
});
