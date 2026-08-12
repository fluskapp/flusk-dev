/**
 * The two routes the code viewer needs, over a real socket: a file's structure
 * and its source.
 *
 * Both carry a bound and both have to SAY SO. The strip is fetched when a file
 * opens, before any /api/doc call, so an engine-less file that answered a bare
 * `[]` rendered "no structure for this file" with no reason at all — which is
 * the exact failure the registry's reason sentences exist to prevent.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/doc/ts-service.js";
import type { OutlineReply } from "../src/ui/api-doc.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { GREET_TS, posOf, USE_TS } from "./doc-fixture.js";
import { hasRg, put } from "./find-fixture.js";

const rg = it.skipIf(!hasRg());
const SLOW = 30_000;

let home: string;
let work: string;
let ui: UiServer;
let greet: string;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "flusk-apiview-home-"));
	work = mkdtempSync(join(tmpdir(), "flusk-apiview-work-"));
	process.env.FLUSK_HOME = home;
	const app = join(work, "app");
	greet = put(app, "src/greet.ts", GREET_TS);
	put(app, "src/use.ts", USE_TS);
	put(app, "tsconfig.json", '{"include":["src"]}');
	// Indexed like everything else here, and past the source cap on purpose.
	put(app, "huge.txt", "x".repeat(2 * 1024 * 1024 + 16));
	// A tracked file no documentation engine handles: the outline must say why.
	put(app, "notes.txt", "just notes\n");
	const ui2 = { harnessDirs: [], projectDirs: [join(work, "*")] };
	writeFileSync(join(home, "config.json"), JSON.stringify({ ui: ui2 }));
	ui = await startUiServer(0);
}, SLOW);

afterAll(async () => {
	await ui.close();
	disposeService();
	delete process.env.FLUSK_HOME;
	for (const dir of [home, work]) rmSync(dir, { recursive: true, force: true });
});

const q = (path: string, file: string, extra = ""): string =>
	`${path}?file=${encodeURIComponent(file)}${extra}`;

const decl = posOf(GREET_TS, "greet(who: string)");

rg(
	"serves a structure view for the file, in source order",
	async () => {
		const body = (await call(ui.url, q("/api/doc/outline", greet))).body;
		const { items } = JSON.parse(body) as OutlineReply;
		expect(items.map((i) => i.name)).toEqual(
			expect.arrayContaining(["greet", "Person", "Greeter", "all"]),
		);
		expect(items.find((i) => i.name === "greet")?.line).toBe(decl.line);
		// `all` is a method: nested one level under its class.
		expect(items.find((i) => i.name === "all")?.depth).toBe(1);
		// Source order, because the strip sits beside the file and navigates by line.
		const lines = items.map((i) => i.line);
		expect(lines).toEqual([...lines].sort((a, b) => a - b));
	},
	SLOW,
);

rg(
	"says WHY a file has no structure, rather than an empty list",
	async () => {
		// The strip is fetched when a file opens, before any /api/doc call, so an
		// engine-less file must carry its own sentence or it renders reasonless.
		const plain = join(work, "app", "notes.txt");
		const body = (await call(ui.url, q("/api/doc/outline", plain))).body;
		const reply = JSON.parse(body) as OutlineReply;
		expect(reply.items).toEqual([]);
		expect(reply.note).toBeTruthy();
		expect(reply.note).toContain(".txt");
	},
	SLOW,
);

rg(
	"serves source with its language, and refuses an oversize file",
	async () => {
		const ok = await call(ui.url, q("/api/source", greet));
		const body = JSON.parse(ok.body) as { text: string; lang: string; bytes: number };
		expect(ok.status).toBe(200);
		expect(body.lang).toBe("ts");
		expect(body.text).toContain("export function greet");
		expect(body.bytes).toBe(GREET_TS.length);
		const big = await call(ui.url, q("/api/source", join(work, "app", "huge.txt")));
		expect(big.status).toBe(413);
		expect(big.body).toContain("larger than");
	},
	SLOW,
);
