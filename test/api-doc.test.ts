/**
 * The documentation endpoints over a real socket, against a real TypeScript
 * project — with no language server installed, which is the case this feature
 * was built for.
 *
 * Two properties are load-bearing, and both are asserted rather than assumed:
 * a lookup answers about the symbol the CALLER's 1-based position names (the
 * compiler speaks 0-based, so an off-by-one documents the character next door
 * instead of throwing), and every path a request can name must be one the
 * scanners indexed — a file outside the roots, and a traversal, are refused.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/features/docs/ts-service.js";
import type { DocReply, OutlineReply } from "../src/features/docs/doc.router.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { GREET_TS, posOf, USE_TS } from "./doc-fixture.js";
import { hasRg, put } from "./find-fixture.js";

/** ripgrep lists what is indexable; without it there is nothing to serve. */
const rg = it.skipIf(!hasRg());
const SLOW = 30_000;

let home: string;
let work: string;
let outside: string;
let ui: UiServer;
let greet: string;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "flusk-apidoc-home-"));
	work = mkdtempSync(join(tmpdir(), "flusk-apidoc-work-"));
	outside = mkdtempSync(join(tmpdir(), "flusk-apidoc-out-"));
	process.env.FLUSK_HOME = home;
	const app = join(work, "app");
	greet = put(app, "src/greet.ts", GREET_TS);
	put(app, "src/use.ts", USE_TS);
	put(app, "tsconfig.json", '{"include":["src"]}');
	put(outside, "secret.ts", "export const token = 'BEGIN OPENSSH PRIVATE KEY';\n");
	const ui2 = { harnessDirs: [], projectDirs: [join(work, "*")] };
	writeFileSync(join(home, "config.json"), JSON.stringify({ ui: ui2 }));
	ui = await startUiServer(0);
}, SLOW);

afterAll(async () => {
	await ui.close();
	disposeService();
	delete process.env.FLUSK_HOME;
	for (const dir of [home, work, outside]) rmSync(dir, { recursive: true, force: true });
});

const q = (path: string, file: string, extra = ""): string =>
	`${path}?file=${encodeURIComponent(file)}${extra}`;

const at = async (file: string, line: number, col: number): Promise<DocReply> =>
	JSON.parse(
		(await call(ui.url, q("/api/doc", file, `&line=${line}&col=${col}`))).body,
	) as DocReply;

const decl = posOf(GREET_TS, "greet(who: string)");

rg(
	"documents the symbol under a 1-based position, with its history",
	async () => {
		const r = await at(greet, decl.line, decl.col);
		expect(r.doc?.name).toBe("greet");
		expect(r.doc?.signature).toBe("function greet(who: string): string");
		expect(r.doc?.docs).toBe("Greets a person by name.");
		expect(r.doc?.provider).toBe("typescript");
		// The call in use.ts is what a "find usages" answer has to contain.
		expect(r.doc?.references.some((l) => l.file.endsWith("use.ts"))).toBe(true);
		// Folded in server-side so the panel is one request — and never fatal.
		expect(r.related === null || Array.isArray(r.related.commits)).toBe(true);
		expect(r.note).toBeUndefined();
	},
	SLOW,
);

rg(
	"answers empty space with null and a reason, not an error",
	async () => {
		const blank = GREET_TS.split("\n").indexOf("") + 1;
		const r = await at(greet, blank, 1);
		expect(r.doc).toBeNull();
		expect(r.related).toBeNull();
		expect(r.note).toBe("no symbol at this position");
	},
	SLOW,
);

rg(
	"refuses a path outside the roots, and a traversal",
	async () => {
		const away = join(outside, "secret.ts");
		const leak = await call(ui.url, q("/api/doc", away, "&line=1&col=14"));
		expect(leak.status).toBe(400);
		expect(leak.body).toContain("not an indexed file");
		expect(leak.body).not.toContain("PRIVATE KEY");
		// The same rule on the other two routes...
		expect((await call(ui.url, q("/api/source", away))).status).toBe(400);
		expect((await call(ui.url, q("/api/doc/outline", away))).status).toBe(400);
		// ...and a traversal is resolved BEFORE membership is tested, so climbing
		// out is refused while a path that climbs back to an indexed file reads.
		const out = join(work, "app", "src", "..", "..", "..", "etc", "passwd");
		expect((await call(ui.url, q("/api/source", out))).status).toBe(400);
		const back = join(work, "app", "src", "..", "src", "greet.ts");
		expect((await call(ui.url, q("/api/source", back))).status).toBe(200);
	},
	SLOW,
);
