/**
 * The Ask-AI read endpoints against a real socket and a real TypeScript
 * project: what gets attached, and who is offered to answer.
 *
 * Two properties carry the feature. The context is assembled from a POSITION
 * — the caller sends the file and 1-based caret it has on screen and gets the
 * symbol, its span and its blast radius back, so nobody pastes anything. And
 * every half that could not be assembled arrives as a SENTENCE: an unbuilt
 * graph and an unindexed file are different refusals with different remedies,
 * and a panel that shows neither looks broken.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/features/docs/ts-service.js";
import type { Answerer, AskContext } from "../src/features/orchestra/ask.types.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { GREET_TS, posOf, USE_TS } from "./doc-fixture.js";
import { hasRg, put } from "./find-fixture.js";

const rg = it.skipIf(!hasRg());
const SLOW = 30_000;

let home: string;
let work: string;
let ui: UiServer;
let app: string;
let greet: string;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "flusk-ask-home-"));
	work = mkdtempSync(join(tmpdir(), "flusk-ask-work-"));
	process.env.FLUSK_HOME = home;
	app = join(work, "app");
	greet = put(app, "src/greet.ts", GREET_TS);
	put(app, "src/use.ts", USE_TS);
	put(app, "tsconfig.json", '{"include":["src"]}');
	// A project-scoped spec naming a backend nobody configured: the case where
	// hiding the row would leave the user hunting for an agent that is unplugged.
	mkdirSync(join(app, ".flusk", "agents"), { recursive: true });
	writeFileSync(
		join(app, ".flusk", "agents", "ghost-runner.md"),
		"---\nname: ghost-runner\ndescription: Use when testing an unresolvable backend\n" +
			"worker: cli\nbackendId: ghost\n---\n\nYou are a spec that cannot run.\n",
	);
	writeFileSync(
		join(home, "config.json"),
		JSON.stringify({
			ui: { harnessDirs: [], projectDirs: [join(work, "*")] },
			chat: { backends: [{ id: "half", label: "Half", kind: "openai-compatible", model: "m" }] },
		}),
	);
	ui = await startUiServer(0);
}, SLOW);

afterAll(async () => {
	await ui.close();
	disposeService();
	delete process.env.FLUSK_HOME;
	for (const dir of [home, work]) rmSync(dir, { recursive: true, force: true });
});

const context = async (file: string, line: number, col: number): Promise<AskContext> =>
	JSON.parse(
		(
			await call(
				ui.url,
				`/api/ask/context?file=${encodeURIComponent(file)}&line=${line}&col=${col}`,
			)
		).body,
	) as AskContext;

const decl = posOf(GREET_TS, "greet(who: string)");

rg(
	"attaches the symbol, its span and the reason there is no blast radius",
	async () => {
		const ctx = await context(greet, decl.line, decl.col);
		expect(ctx.symbol).toBe("greet");
		expect(ctx.project).toBe("app");
		const symbol = ctx.blocks.find((b) => b.id === "symbol");
		expect(symbol?.text).toContain("function greet(who: string): string");
		expect(symbol?.text).toContain("Greets a person by name.");
		expect(symbol?.text).toContain("@param who the name to greet");
		// The usage in use.ts is the half a pasted snippet could never carry.
		expect(symbol?.text).toContain("use.ts");
		// The span is the declaration, numbered with the FILE's own line numbers.
		const span = ctx.blocks.find((b) => b.id === "span");
		expect(span?.label).toContain("greet.ts lines");
		expect(span?.text).toContain(`${decl.line}| export function greet`);
		// No graph has been built here, and that is said rather than left blank.
		expect(ctx.blocks.find((b) => b.id === "blast")).toBeUndefined();
		expect(ctx.notes.join(" ")).toContain("no code graph has been built for app");
	},
	SLOW,
);

rg(
	"still attaches the file when the position names no symbol",
	async () => {
		const ctx = await context(greet, 1, 1);
		expect(ctx.blocks.map((b) => b.id)).toContain("span");
		expect(ctx.notes.join(" ")).toMatch(/no symbol|engine/);
	},
	SLOW,
);

it("refuses an unindexed path with a sentence, not an empty box", async () => {
	const ctx = await context("/etc/passwd", 1, 1);
	expect(ctx.blocks).toEqual([]);
	expect(ctx.file).toBeNull();
	expect(ctx.notes[0]).toContain("Open a source file");
});

it("offers agents and backends together, keeping unavailable rows with a reason", async () => {
	const res = await call(ui.url, `/api/ask/answerers?repo=${encodeURIComponent(app)}`);
	expect(res.status).toBe(200);
	const list = JSON.parse(res.body) as Answerer[];
	// The repo's own spec is offered — a spec is a prompt, so an untrusted layer
	// may contribute one — and it is offered UNAVAILABLE, naming what is missing.
	const ghost = list.find((a) => a.id === "agent:ghost-runner");
	expect(ghost).toMatchObject({ kind: "agent", scope: "project", available: false });
	expect(ghost?.note).toContain('backend "ghost" is not configured');
	// A backend with no baseUrl is listed the same way, never dropped.
	const half = list.find((a) => a.id === "backend:half");
	expect(half).toMatchObject({ available: false, note: "set baseUrl" });
	// The builtins are there, and every row says which backend would answer.
	expect(list.filter((a) => a.kind === "agent").map((a) => a.label)).toContain("code-reviewer");
	for (const row of list) expect(row.available ? row.backendId : "unavailable").toBeTruthy();
});

it("ships every agent's own prompt with its row, so the panel can show it first", async () => {
	// api-ask-stream.ts puts this text at the HEAD of the message, outside the
	// fenced blocks, and the `prompt` frame only arrives after the request is
	// already on its way. Without the preamble on the row there is nothing to
	// disclose before Ask is pressed, and the byte count understates the prompt.
	const res = await call(ui.url, `/api/ask/answerers?repo=${encodeURIComponent(app)}`);
	const list = JSON.parse(res.body) as Answerer[];
	const ghost = list.find((a) => a.id === "agent:ghost-runner");
	expect(ghost?.preamble).toContain("You are a spec that cannot run.");
	// Every agent carries one, and its provenance travels beside it.
	for (const row of list.filter((a) => a.kind === "agent")) {
		expect(typeof row.preamble).toBe("string");
		expect(["builtin", "global", "project", "generated"]).toContain(row.scope);
	}
	// A raw backend has no author and no prompt of its own.
	expect(list.find((a) => a.id === "backend:half")?.preamble).toBeUndefined();
});
