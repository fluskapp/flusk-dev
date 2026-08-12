import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { FILE_MAX } from "../src/agent/workspace-files.js";
import { houseRulesSource } from "../src/context/source-house-rules.js";
import type { ContextRequest } from "../src/context/types.js";

let repo: string;

beforeEach(async () => {
	repo = await mkdtemp(join(tmpdir(), "flusk-house-rules-fail-"));
});

const req = (): ContextRequest => ({
	task: "add a verify step",
	repoRoot: repo,
	budgetTokens: 4000,
	isResume: false,
});

const put = async (rel: string, body: string): Promise<void> => {
	const path = join(repo, rel);
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, body);
};

test("an unreadable AGENTS.md costs one item and a note, never the rest", async () => {
	await mkdir(join(repo, "AGENTS.md"), { recursive: true }); // a directory, not a file
	await put("CLAUDE.md", "Never push to main.");

	const got = houseRulesSource.gather(req());
	expect(got.items.map((i) => i.path)).toEqual(["CLAUDE.md"]);
	expect(got.status).toBe("partial");
	expect(got.notes.join(" ")).toContain("AGENTS.md");
});

test("nothing readable at all is failed, not skipped — and the reason says which", async () => {
	await mkdir(join(repo, "CLAUDE.md"), { recursive: true });

	const got = houseRulesSource.gather(req());
	expect(got.items).toEqual([]);
	expect(got.status).toBe("failed");
	expect(got.notes.length).toBeGreaterThan(0);
});

test("no note, title, why or path carries an absolute path", async () => {
	await mkdir(join(repo, "AGENTS.md"), { recursive: true });
	await put("CONTRIBUTING.md", "contributor rules");

	const got = houseRulesSource.gather(req());
	const surfaces = [
		...got.notes,
		...got.items.flatMap((i) => [i.title, i.why, i.path ?? "", i.body]),
	];
	for (const s of surfaces) {
		expect(s).not.toContain(repo);
		expect(s).not.toContain(tmpdir());
	}
});

test("a rules file longer than the cap is clipped at a line boundary and confesses it", async () => {
	const line = "Every file states why it exists.\n";
	await put("AGENTS.md", line.repeat(Math.ceil((FILE_MAX * 2) / line.length)));

	const got = houseRulesSource.gather(req());
	const item = got.items[0];
	expect(got.status).toBe("partial");
	expect(got.notes.join(" ")).toContain("clipped AGENTS.md");
	expect(item?.why).toContain("Clipped to the first");
	expect((item?.body ?? "").length).toBeLessThanOrEqual(FILE_MAX);
	expect(item?.body.endsWith("exists.")).toBe(true); // cut on a line, not mid-rule
});

test("a secret in a rules file is redacted, and its file paths survive", async () => {
	await put(
		"AGENTS.md",
		[
			"Deploy with token ghp_abcdefghijklmnop0123456789 before merging.",
			"Touch only src/context/source-house-rules.ts and base44/functions/handleUserThing.ts.",
		].join("\n"),
	);

	const body = houseRulesSource.gather(req()).items[0]?.body ?? "";
	expect(body).not.toContain("ghp_abcdefghijklmnop0123456789");
	expect(body).toContain("[redacted: github token]");
	// The recorded trap: an over-eager scrubber ate file paths as high entropy.
	expect(body).toContain("src/context/source-house-rules.ts");
	expect(body).toContain("base44/functions/handleUserThing.ts");
});

test("past the rules-document cap the extras are dropped with a stated reason", async () => {
	await put("CONTRIBUTING.md", "root contributing");
	await put("CONVENTIONS.md", "root conventions");
	await put("STYLE.md", "root style");
	for (const name of ["AGENTS.md", "CLAUDE.md", "CONTRIBUTING.md", "CONVENTIONS.md", "STYLE.md"])
		await put(join("docs", name), `docs ${name}`);

	const got = houseRulesSource.gather(req());
	expect(got.items).toHaveLength(6);
	expect(got.status).toBe("partial");
	expect(got.notes.join(" ")).toContain("rules-document cap");
	// The two that lost are the deepest-sorting ones, not an arbitrary pair.
	expect(got.items.map((i) => i.path)).not.toContain("docs/CONVENTIONS.md");
});

test("gather never throws on a repo root that does not exist", () => {
	const got = houseRulesSource.gather({ ...req(), repoRoot: join(repo, "gone") });
	expect(got.items).toEqual([]);
	expect(got.status).toBe("skipped");
});

test("every item keeps a specific why and is marked untrusted quoted material", async () => {
	await put("AGENTS.md", "agent rules");
	await put("docs/STYLE.md", "docs style");

	for (const item of houseRulesSource.gather(req()).items) {
		expect(item.why.trim()).not.toBe("");
		expect(item.why).toContain(item.path ?? "");
		expect((item as { trust?: string }).trust).toBe("untrusted");
	}
});
