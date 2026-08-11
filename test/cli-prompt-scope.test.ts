/**
 * Scope behaviour of `ah prompt`.
 *
 * Regression: `--repo` defaults to the working directory, so running from a
 * directory that is not an indexed project scoped the cards to a project that
 * does not exist and printed an empty prompt. Widening beats refusing — the
 * question still gets an answer, and the scope change is stated.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { promptCmd } from "../src/cli/prompt-cmd.js";
import { saveIndex } from "../src/history/index-store.js";
import type { HistoryCard } from "../src/history/types.js";
import { capture } from "./cli2-helpers.js";

let home: string;

const card = (id: string, project: string, title: string, text: string): HistoryCard => ({
	id,
	kind: "commit",
	project,
	title,
	text,
	at: "2026-07-01T10:00:00.000Z",
	paths: ["src/parser.ts"],
	outcome: "shipped",
	ref: id,
});

beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "ah-scope-"));
	process.env.AH_HOME = home;
	saveIndex({
		cards: [
			card("commit:alpha:1", "alpha", "parser: fix the tokenizer", "the parser dropped a token"),
			card("commit:beta:2", "beta", "parser: rewrite lookahead", "lookahead in the parser"),
		],
		builtAt: new Date().toISOString(),
		stamps: {},
	});
});

afterAll(() => {
	delete process.env.AH_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("widens to all projects when the working directory is not indexed", () => {
	const out = capture();
	expect(promptCmd("fix the parser", { repo: "/nonexistent/not-a-project", out: out.out })).toBe(0);
	const text = out.text();
	expect(text).toContain("has no indexed history — searching all projects");
	expect(text).toContain("## task");
});

it("stays scoped when the working directory IS an indexed project", () => {
	const out = capture();
	expect(promptCmd("fix the parser", { repo: "/somewhere/alpha", out: out.out })).toBe(0);
	const text = out.text();
	expect(text).not.toContain("searching all projects");
	expect(text).toContain("scope: alpha");
});
