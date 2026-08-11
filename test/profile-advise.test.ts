/**
 * The profiler and the advice it produces.
 *
 * The assertion that matters most is the boring one: no suggestion without
 * evidence. A recommender that occasionally invents a reason is worse than no
 * recommender, because its right answers and its wrong answers look identical
 * on the page.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { advise } from "../src/profile/advise.js";
import { buildProfile } from "../src/profile/profile.js";

let dir: string;

afterEach(() => rmSync(dir, { recursive: true, force: true }));

function repo(files: Record<string, string>): string {
	dir = mkdtempSync(join(tmpdir(), "ah-profile-"));
	for (const [rel, body] of Object.entries(files)) {
		const path = join(dir, rel);
		mkdirSync(join(path, ".."), { recursive: true });
		writeFileSync(path, body);
	}
	return dir;
}

const pkg = (o: unknown): string => JSON.stringify(o);

it("cites a file for every detection", () => {
	const root = repo({
		"package.json": pkg({ dependencies: { pg: "^8", react: "^18" }, scripts: { test: "vitest" } }),
	});
	const p = buildProfile(root);
	const all = [...p.stack, ...p.tooling, ...p.services];
	expect(all.length).toBeGreaterThan(0);
	for (const d of all) {
		expect(d.evidence.length, d.name).toBeGreaterThan(0);
		for (const e of d.evidence) expect(e.file).not.toBe("");
	}
	expect(p.services.map((d) => d.name)).toContain("postgres");
	expect(p.stack.map((d) => d.name)).toContain("react");
});

it("NEVER emits a suggestion without evidence", () => {
	const root = repo({
		"package.json": pkg({ dependencies: { pg: "^8" }, scripts: { test: "vitest" } }),
	});
	const { suggestions } = advise(buildProfile(root));
	expect(suggestions.length).toBeGreaterThan(0);
	for (const s of suggestions) {
		expect(s.why.length, s.id).toBeGreaterThan(0);
		for (const e of s.why) expect(e.note, s.id).not.toBe("");
	}
});

it("suggests only what the signals support", () => {
	const plain = repo({ "package.json": pkg({ name: "x" }) });
	const { suggestions } = advise(buildProfile(plain));
	// No database, no browser tests, no github remote: none of those may appear.
	const ids = suggestions.map((s) => s.id);
	expect(ids).not.toContain("mcp:postgres");
	expect(ids).not.toContain("mcp:puppeteer");
	expect(ids).not.toContain("mcp:github");
});

it("finds postgres in a compose file as well as in dependencies", () => {
	const root = repo({
		"package.json": pkg({ name: "x" }),
		"docker-compose.yml": "services:\n  db:\n    image: postgres:16\n",
	});
	const p = buildProfile(root);
	const pgFound = p.services.find((d) => d.name === "postgres");
	expect(pgFound).toBeDefined();
	expect(pgFound?.evidence[0]?.file).toBe("docker-compose.yml");
});

it("separates house rules from the readme", () => {
	const root = repo({
		"package.json": pkg({ name: "x" }),
		"README.md": "# The product\n",
		"AGENTS.md": "# How to work here\n",
		"docs/design.md": "# Design\n",
	});
	const { docs } = buildProfile(root);
	expect(docs[0]?.kind).toBe("rules"); // rules first: it is what an agent reads
	expect(docs.find((d) => d.file === "README.md")?.kind).toBe("readme");
	expect(docs.find((d) => d.file === "AGENTS.md")?.title).toBe("How to work here");
});

it("says a profile is partial rather than reporting an empty one", () => {
	const root = repo({ "package.json": "{ this is not json" });
	const p = buildProfile(root);
	// Silence here would read as "this repo declares nothing".
	expect(p.unreadable).toContain("package.json");
});

it("marks what is already in place instead of hiding it", () => {
	const root = repo({
		"package.json": pkg({ scripts: { test: "vitest" } }),
		"CONTRIBUTING.md": "# How we work\n",
	});
	const { suggestions } = advise(buildProfile(root));
	const verify = suggestions.find((s) => s.id === "skill:verify");
	// The repo states its rules, so the skill is present — and still listed,
	// so "what about writing this down?" has a visible answer.
	expect(verify?.status).toBe("present");
});

it("puts what is missing above what is done", () => {
	const root = repo({
		"package.json": pkg({ dependencies: { pg: "^8" }, scripts: { test: "vitest" } }),
		"CONTRIBUTING.md": "# rules\n",
	});
	const { suggestions } = advise(buildProfile(root));
	const firstPresent = suggestions.findIndex((s) => s.status === "present");
	const lastMissing = suggestions.map((s) => s.status).lastIndexOf("missing");
	if (firstPresent !== -1) expect(firstPresent).toBeGreaterThan(lastMissing);
});

it("hands over text to paste, and applies nothing", () => {
	const root = repo({
		"package.json": pkg({ dependencies: { pg: "^8" }, scripts: { test: "vitest" } }),
	});
	const { suggestions } = advise(buildProfile(root));
	const mcp = suggestions.find((s) => s.id === "mcp:postgres");
	expect(mcp?.apply?.content).toContain("@modelcontextprotocol/server-postgres");
	expect(mcp?.apply?.target).toContain("config.json");
});
