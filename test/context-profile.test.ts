/**
 * The repo-profile context source, against real directories.
 *
 * Nothing is mocked: buildProfile, gatherDocs, redact and estimateTokens are
 * the modules under test as much as the source is, because the failure this
 * guards against is the source and the profiler disagreeing about what the
 * repo contains. Temp dirs are cheap; a fake manifest reader that stayed right
 * while readManifests changed would be worse than no test.
 *
 * The three cases that matter: an empty repo says so rather than returning
 * silence, an unreadable manifest is reported rather than swallowed, and every
 * item's `why` names a file a reader can open.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { profileSource } from "../src/context/source-profile.js";
import type { ContextRequest } from "../src/context/types.js";
import { estimateTokens } from "../src/history/budget.js";

let dir: string;

afterEach(() => rmSync(dir, { recursive: true, force: true }));

function repo(files: Record<string, string>): string {
	dir = mkdtempSync(join(tmpdir(), "flusk-ctx-profile-"));
	for (const [rel, body] of Object.entries(files)) {
		const path = join(dir, rel);
		mkdirSync(join(path, ".."), { recursive: true });
		writeFileSync(path, body);
	}
	return dir;
}

const req = (root: string, task = "add a test"): ContextRequest => ({
	task,
	repoRoot: root,
	budgetTokens: 4000,
	isResume: false,
});

const pkg = (o: unknown): string => JSON.stringify(o);

it("orients a run in the stack and tooling it will be judged by", () => {
	const root = repo({
		"package.json": pkg({
			devDependencies: { typescript: "^5", vitest: "^3", "@biomejs/biome": "^2" },
		}),
	});
	const res = profileSource.gather(req(root));
	expect(res.status).toBe("ok");
	expect(res.notes).toEqual([]);
	const bodies = res.items.map((i) => i.body).join("\n");
	expect(bodies).toContain("typescript (language)");
	expect(bodies).toContain("vitest (tool)");
	expect(bodies).toContain("biome (tool)");
	// Shallow by design: the evidence is the dependency name, nothing deeper.
	expect(bodies).toContain("package.json: depends on vitest");
});

it("says nothing to profile instead of returning a silent empty result", () => {
	const root = repo({ "notes.txt": "hello" });
	const res = profileSource.gather(req(root));
	expect(res.items).toEqual([]);
	expect(res.status).toBe("skipped");
	expect(res.notes.length).toBe(1);
	expect(res.notes[0]).toMatch(/nothing here to profile/);
});

it("reports an unreadable manifest as partial rather than as an empty repo", () => {
	const root = repo({
		"package.json": "{ this is not json",
		"AGENTS.md": "# House rules\n",
	});
	const res = profileSource.gather(req(root));
	expect(res.status).toBe("partial");
	expect(res.notes.some((n) => n.includes("package.json"))).toBe(true);
	// Degraded, not dead: the docs it could read are still here (L7).
	expect(res.items.some((i) => i.id === "profile:docs")).toBe(true);
});

it("gives every item a `why` that names the file it came from", () => {
	const root = repo({
		"package.json": pkg({ dependencies: { pg: "^8" }, scripts: { test: "vitest" } }),
		"docker-compose.yml": "services:\n  db:\n    image: postgres:16\n",
		"README.md": "# The product\n",
	});
	const res = profileSource.gather(req(root));
	expect(res.items.length).toBeGreaterThan(1);
	for (const i of res.items) {
		expect(i.why, i.id).not.toBe("");
		expect(i.why, i.id).toMatch(/\.(json|yml|md|ts)\b|src\/profile\//);
		expect(i.why, i.id).not.toMatch(/relevant to the task/i);
		expect(i.body, i.id).not.toBe("");
	}
	const services = res.items.find((i) => i.id === "profile:services");
	expect(services?.body).toContain("docker-compose.yml");
});

it("never lets an absolute path reach the block", () => {
	const root = repo({
		"package.json": pkg({ devDependencies: { vitest: "^3" } }),
		"docs/design.md": "# Design\n",
	});
	const res = profileSource.gather(req(root));
	for (const i of res.items) {
		for (const field of [i.title, i.why, i.body, i.path ?? ""]) {
			expect(field, i.id).not.toContain(root);
			expect(field, i.id).not.toContain("/Users/");
		}
	}
});

it("counts tokens over exactly what will be rendered", () => {
	const root = repo({ "package.json": pkg({ devDependencies: { vitest: "^3" } }) });
	for (const i of profileSource.gather(req(root)).items) {
		expect(i.tokens).toBe(estimateTokens(`${i.title}\n${i.why}\n${i.body}`));
		expect(i.tier).toBe("ranked");
	}
});
