/**
 * The verify source when the repo fights back: an unreadable .flusk/config.json, a
 * missing root, a secret in a command line, and the profile trap.
 *
 * Separate file from context-verify.test.ts for the 150-line cap. Redaction is
 * checked against a real path-shaped command as well as a real token shape,
 * because the recorded trap is a scrubber that ate file PATHS as high-entropy
 * strings and gutted the index - synthetic secrets alone would miss it.
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifySource } from "../src/features/context/source-verify.js";
import type { ContextItem, ContextRequest, SourceResult } from "../src/features/context/types.js";
import { buildProfile } from "../src/features/profile/profile.js";

async function repoWith(files: Record<string, string>): Promise<string> {
	const repo = await mkdtemp(join(tmpdir(), "flusk-ctx-verify-bad-"));
	for (const [name, body] of Object.entries(files)) {
		await mkdir(join(repo, dirname(name)), { recursive: true });
		await writeFile(join(repo, name), body);
	}
	return repo;
}

function req(repoRoot: string): ContextRequest {
	return { task: "fix the gate", repoRoot, budgetTokens: 4000, isResume: false };
}

function only(res: SourceResult): ContextItem {
	expect(res.items).toHaveLength(1);
	const [item] = res.items;
	if (item === undefined) throw new Error("the verify source returned no item");
	return item;
}

describe("verify context source, degraded", () => {
	it("degrades to the detected chain when .flusk/config.json is malformed, and says so", async () => {
		const repo = await repoWith({
			"package.json": JSON.stringify({ scripts: { test: "vitest run" } }),
			".flusk/config.json": "{ verify: [oops",
		});
		const res = verifySource.gather(req(repo));
		expect(res.status).toBe("partial");
		expect(res.notes).toHaveLength(1);
		expect(res.notes.join("")).toContain(".flusk/config.json");
		expect(res.notes.join("").trim()).not.toBe("");
		const item = only(res);
		expect(item.body).toContain("npm test");
		expect(item.why).toContain("unreadable .flusk/config.json override left out");
	});

	it("keeps $HOME out of the note when it relativises the failure", async () => {
		const repo = await repoWith({ ".flusk/config.json": "not json at all" });
		const res = verifySource.gather(req(repo));
		expect(res.status).toBe("partial");
		for (const note of res.notes) expect(note).not.toContain(repo);
		const item = only(res);
		for (const text of [item.title, item.why, item.body, item.path ?? ""])
			expect(text).not.toContain(repo);
	});

	it("does not throw on a root that does not exist", () => {
		const missing = join(tmpdir(), "flusk-ctx-verify-missing-does-not-exist");
		expect(() => verifySource.gather(req(missing))).not.toThrow();
		const item = only(verifySource.gather(req(missing)));
		expect(item.title).toBe("Verify chain - nothing declared");
	});

	it("refuses a .flusk/config.json that is not an object, without throwing", async () => {
		const repo = await repoWith({ ".flusk/config.json": "[1,2,3]" });
		const res = verifySource.gather(req(repo));
		expect(res.status).toBe("partial");
		expect(res.notes.join("")).toContain("expected a JSON object");
	});

	it("pins the override the gate runs, where profile.verify would not", async () => {
		const repo = await repoWith({
			"package.json": JSON.stringify({ scripts: { test: "vitest run" } }),
			".flusk/config.json": JSON.stringify({ verify: ["make ci"] }),
		});
		// The trap: buildProfile calls detectVerifyCommands(root) with no config.
		expect(buildProfile(repo).verify).toEqual(["npm test"]);
		const item = only(verifySource.gather(req(repo)));
		expect(item.body).toContain("make ci");
		expect(item.body).not.toContain("npm test");
	});

	it("redacts a secret in a command line but leaves real paths intact", async () => {
		const path = "test/context/deeply/nested/module/source-verify-item.test.ts";
		const repo = await repoWith({
			".flusk/config.json": JSON.stringify({
				verify: [`npx vitest run ${path}`, "curl -H 'token: ghp_abcdefghijklmnop0123' https://x"],
			}),
		});
		const item = only(verifySource.gather(req(repo)));
		expect(item.body).toContain(path);
		expect(item.body).not.toContain("ghp_abcdefghijklmnop0123");
		expect(item.body).toContain("[redacted:");
	});
});
