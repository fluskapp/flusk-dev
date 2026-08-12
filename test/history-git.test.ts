import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gitCards, logArgs } from "../src/history/source-git.js";

const dirs: string[] = [];
afterAll(async () => {
	while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

async function scratchDir(prefix = "flusk-hist-"): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), prefix));
	dirs.push(dir);
	return dir;
}

/** A scratch repo per shell process: under vitest each spawnSync costs ~300ms. */
async function build(script: string): Promise<{ dir: string; out: string }> {
	const dir = await scratchDir();
	const setup = `set -e\ncd "${dir}"\ngit init -q -b main\ngit config user.email t@example.com\ngit config user.name T\ngit config commit.gpgsign false\n`;
	const res = spawnSync("sh", ["-c", setup + script], { encoding: "utf8" });
	if (res.status !== 0) throw new Error(`fixture failed: ${res.stderr}`);
	return { dir, out: res.stdout.trim() };
}

const add = (msg: string, files: string, body = ""): string =>
	`${files}\ngit add -A\ngit commit -q --allow-empty -m '${msg}'${body ? ` -m '${body}'` : ""}\n`;

/** feat → lockfile-only → noisy-with-secret → revert-of-the-first. */
function fixture(): Promise<{ dir: string; out: string }> {
	return build(
		add("feat: add widget", "echo w > widget.ts") +
			"W=$(git rev-parse HEAD)\n" +
			add("chore: bump deps", "echo l > package-lock.json") +
			add("feat: styles", "echo a > a.css\necho m > app.min.js", "leaked password=hunter2 here") +
			add("feat: add undo button", "echo u > undo.ts") +
			'echo w2 > widget.ts\ngit add -A\ngit commit -q -m \'Revert "feat: add widget"\' -m "This reverts commit $W."\n' +
			'echo "$W"\n',
	);
}

describe("git cards", () => {
	let repo = "";
	let widget = "";
	// Six git commits through one shell; under a loaded machine the default
	// 10s hook budget is the flake, not the fixture.
	beforeAll(async () => {
		const { dir, out } = await fixture();
		repo = dir;
		widget = out;
	}, 60_000);

	it("builds a card whose shape matches the frozen contract", () => {
		const cards = gitCards(repo);
		const card = cards.find((c) => c.ref === widget);
		const project = repo.split("/").pop();
		expect(card?.id).toBe(`commit:${project}:${widget.slice(0, 8)}`);
		expect(card?.kind).toBe("commit");
		expect(card?.project).toBe(project);
		expect(card?.title).toBe("feat: add widget");
		expect(card?.paths).toEqual(["widget.ts"]);
		expect(card?.text).toContain("feat: add widget");
		expect(card?.text.length).toBeLessThanOrEqual(1500);
		expect(Date.parse(card?.at ?? "")).toBeGreaterThan(0);
		expect(cards[0]?.title).toBe('Revert "feat: add widget"'); // newest first
	});

	it("marks the revert failed AND the commit it reverted", () => {
		const cards = gitCards(repo);
		expect(cards[0]?.outcome).toBe("failed"); // the revert itself
		expect(cards.find((c) => c.ref === widget)?.outcome).toBe("failed"); // …its target
		expect(cards.find((c) => c.title === "feat: styles")?.outcome).toBe("shipped");
		// an undo FEATURE is not a rollback, though "undo" is a trigger word
		expect(cards.find((c) => c.title === "feat: add undo button")?.outcome).toBe("shipped");
	});

	it("indexes the real corpus fast and without eating its paths", () => {
		const roots = ["/Users/ashb/projects/linof-base", "/Users/ashb/projects/abagraph"].filter((r) =>
			existsSync(join(r, ".git")),
		);
		for (const root of roots) {
			const started = Date.now();
			const cards = gitCards(root);
			const count = (p: (c: (typeof cards)[number]) => boolean) => cards.filter(p).length;
			expect(cards.length).toBeGreaterThan(100);
			expect(Date.now() - started).toBeLessThan(5000);
			expect(count((c) => c.text.length <= 1500 && c.at !== "")).toBe(cards.length);
			// Over-redaction is the failure mode that would gut this index: "/" in
			// the entropy charset once redacted 679 of 793 commits' path lists.
			expect(count((c) => c.text.includes("[redacted"))).toBeLessThan(cards.length * 0.05);
			expect(count((c) => c.paths.length > 0)).toBeGreaterThan(cards.length * 0.5);
		}
	});

	it("drops a lockfile-only commit, strips build output, scrubs the text", () => {
		const cards = gitCards(repo);
		expect(cards.map((c) => c.title)).not.toContain("chore: bump deps");
		const styles = cards.find((c) => c.title === "feat: styles");
		expect(styles?.paths).toEqual(["a.css"]); // app.min.js excluded
		expect(styles?.text).not.toContain("hunter2");
		expect(styles?.text).toContain("[redacted: password]");
	});

	it("honours limit and never throws outside a repo", async () => {
		expect(gitCards(repo, { limit: 1 })).toHaveLength(1);
		expect(gitCards(repo, { limit: 0 })).toEqual([]);
		for (const d of [await scratchDir(), "/definitely/not/here"]) expect(gitCards(d)).toEqual([]);
		expect(logArgs(800)).toContain("--max-count=800");
		expect(logArgs(9, "2 weeks ago")).toContain("--since=2 weeks ago");
	});

	it("skips a boilerplate merge with no body", async () => {
		const { dir } = await build(
			add("base", "echo b > b.ts") +
				"git checkout -q -b side\n" +
				add("side work", "echo s > side.ts") +
				"git checkout -q main\ngit merge -q --no-ff --no-edit -m \"Merge branch 'side'\" side\n",
		);
		const titles = gitCards(dir).map((c) => c.title);
		expect(titles).not.toContain("Merge branch 'side'");
		expect(titles).toContain("side work");
	});

	it("spawns exactly ONE git process for the whole log", async () => {
		const bin = await scratchDir("flusk-bin-");
		const counter = join(bin, "calls");
		const real = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
		await writeFile(join(bin, "git"), `#!/bin/sh\necho . >> "${counter}"\nexec ${real} "$@"\n`, {
			mode: 0o755,
		});
		const prev = process.env.PATH ?? "";
		process.env.PATH = `${bin}:${prev}`;
		try {
			expect(gitCards(repo).length).toBeGreaterThan(0);
		} finally {
			process.env.PATH = prev;
		}
		expect(readFileSync(counter, "utf8").trim().split("\n")).toHaveLength(1);
	});
});
