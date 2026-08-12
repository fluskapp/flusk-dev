import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { FluskConfig } from "../src/config/types.js";
import { journalCards } from "../src/history/source-journals.js";

let home: string; // stands in for ~/projects
let runs: string;

function journal(name: string, frontmatter: string): void {
	writeFileSync(join(runs, `${name}.md`), `---\n${frontmatter}---\n\n# ${name}\n`);
}

const cfg = (): FluskConfig => ({
	...DEFAULT_CONFIG,
	ui: { ...DEFAULT_CONFIG.ui, harnessDirs: [join(home, "*", "docs", "runs")] },
});

const card = (ref: string) => journalCards(cfg()).find((c) => c.ref === join(runs, `${ref}.md`));

beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-journals-"));
	runs = join(home, "linof-harness", "docs", "runs");
	mkdirSync(runs, { recursive: true });
	journal(
		"2026-08-01-shipped",
		'title: "Run: review PR #161"\n' +
			"date: 2026-08-01T01:29:52.772Z\n" +
			"status: done\n" +
			'pr: "https://github.com/adirbenyossef/linof-base/pull/161"\n' +
			'kind: "review"\n' +
			'tool: "claude"\n' +
			"stages:\n" +
			'  routing: "done|26.0s|→ claude (claude=1.00 codex=0.75)"\n' +
			'  verify: "done|23.9s|all checks pass · scripts/check-pipeline-contract.mjs"\n' +
			'  gate: "done|0.0s|pass"\n',
	);
	journal(
		"2026-08-02-blocked",
		'title: "Run: review PR #43"\n' +
			"date: 2026-08-02T01:00:00.000Z\n" +
			"status: failed\n" +
			"stages:\n" +
			'  verify: "done|10.0s|all checks pass"\n' +
			'  gate: "done|78.7s|FAIL: 0 regression(s), verdict block"\n',
	);
	journal(
		"2026-08-03-failed",
		'title: "Run: fix the pipeline"\n' +
			"date: 2026-08-03T01:00:00.000Z\n" +
			"status: failed\n" +
			"stages:\n" +
			'  verify: "failed|9.0s|2 failing specs"\n' +
			'  gate: "pending|0.0s|"\n',
	);
	journal(
		"2026-08-04-stagefail",
		'title: "Run: half done"\n' +
			"date: 2026-08-04T01:00:00.000Z\n" +
			"status: done\n" +
			"stages:\n" +
			'  merge: "failed|1.0s|dirty tree"\n',
	);
	journal(
		"2026-08-05-running",
		'title: "Run: still going"\n' +
			"date: 2026-08-05T01:00:00.000Z\n" +
			"status: running\n" +
			"stages:\n" +
			'  verify: "running|1.0s|"\n',
	);
	journal(
		"2026-08-06-secret",
		'title: "Run: leak ghp_ABCDEFGHIJKLMNOP1234"\n' +
			"date: 2026-08-06T01:00:00.000Z\n" +
			"status: done\n" +
			"stages:\n" +
			'  learn: "done|0.1s|token ghp_ABCDEFGHIJKLMNOP1234 recorded"\n',
	);
});

afterAll(() => rmSync(home, { recursive: true, force: true }));

it("maps every journal ending honestly", () => {
	expect(card("2026-08-01-shipped")?.outcome).toBe("shipped");
	expect(card("2026-08-02-blocked")?.outcome).toBe("blocked");
	expect(card("2026-08-03-failed")?.outcome).toBe("failed");
	expect(card("2026-08-04-stagefail")?.outcome).toBe("failed");
	expect(card("2026-08-05-running")?.outcome).toBe("unknown");
});

it("keeps the stage detail lines, the routing decision and the PR url", () => {
	const c = card("2026-08-01-shipped");
	expect(c?.text).toContain("verify: done|23.9s|all checks pass");
	expect(c?.text).toContain("→ claude (claude=1.00 codex=0.75)");
	expect(c?.text).toContain("kind: review");
	expect(c?.text).toContain("tool: claude");
	expect(c?.text).toContain("pr url: https://github.com/adirbenyossef/linof-base/pull/161");
});

it("carries card identity from the journal", () => {
	const c = card("2026-08-01-shipped");
	expect(c?.kind).toBe("journal");
	expect(c?.id).toBe(`journal:${join(runs, "2026-08-01-shipped.md")}`);
	expect(c?.title).toBe("Run: review PR #161");
	expect(c?.project).toBe("linof-harness");
	expect(c?.at).toBe("2026-08-01T01:29:52.772Z");
});

it("takes paths only from files the journal names, never from the PR url", () => {
	expect(card("2026-08-01-shipped")?.paths).toEqual(["scripts/check-pipeline-contract.mjs"]);
	expect(card("2026-08-02-blocked")?.paths).toEqual([]);
});

it("scrubs secrets out of the title and the stage lines", () => {
	const c = card("2026-08-06-secret");
	expect(c?.title).toBe("Run: leak [redacted: github token]");
	expect(c?.text).not.toContain("ghp_ABCDEFGHIJKLMNOP1234");
	expect(c?.text).toContain("[redacted: github token] recorded");
});
