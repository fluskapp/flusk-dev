/**
 * The search endpoints over a real socket, and `flusk find` over a real stream.
 *
 * Config is read from FLUSK_HOME per request (the fixture writes it), so this is
 * the same path `flusk ui` takes — including the containment rule: `?project=`
 * names a project, never a directory.
 */
import { Writable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findCmd } from "../src/cli/find-cmd.js";
import type { FindResult } from "../src/find/types.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { type FindTree, findTree, hasRg } from "./find-fixture.js";

let t: FindTree;
let ui: UiServer;

beforeAll(async () => {
	t = findTree();
	ui = await startUiServer(0);
});
afterAll(async () => {
	await ui.close();
	t.cleanup();
});

const getJson = async <T>(path: string): Promise<T> =>
	JSON.parse((await call(ui.url, path)).body) as T;

/** Collects what a command wrote, so the rendering can be asserted verbatim. */
function sink(): { out: Writable; text: () => string } {
	const chunks: string[] = [];
	const out = new Writable({
		write(chunk, _enc, cb) {
			chunks.push(String(chunk));
			cb();
		},
	});
	return { out, text: () => chunks.join("") };
}

describe.skipIf(!hasRg())("/api/find", () => {
	it("serves matches across projects with character ranges", async () => {
		const r = await getJson<FindResult>("/api/find?q=needle");
		expect(r.total).toBeGreaterThan(3);
		expect(new Set(r.files.map((f) => f.project))).toEqual(new Set(["alpha", "beta"]));
		const uni = r.files.find((f) => f.path.endsWith("uni.txt"));
		expect(uni?.matches[0]?.ranges).toEqual([[12, 18]]);
	});

	it("passes glob, regex, case and limit through", async () => {
		expect((await getJson<FindResult>("/api/find?q=needle&glob=*.md")).files).toHaveLength(1);
		const literal = await getJson<FindResult>("/api/find?q=n.edle&project=beta");
		expect(literal.total).toBe(1);
		const regex = await getJson<FindResult>("/api/find?q=n.edle&project=beta&regex=1");
		expect(regex.total).toBe(2);
		const exact = await getJson<FindResult>("/api/find?q=NEEDLE&case=1");
		expect(exact.total).toBe(1);
		const capped = await getJson<FindResult>("/api/find?q=needle&limit=2");
		expect(capped).toMatchObject({ total: 2, truncated: true });
		expect(capped.note).toContain("stopped at 2 matches");
	});

	it("answers a traversal in ?project= with a note and no results", async () => {
		const r = await getJson<FindResult>(`/api/find?q=needle&project=${encodeURIComponent("../")}`);
		expect(r).toMatchObject({ total: 0, files: [] });
		expect(r.note).toContain("nothing was searched");
	});
});

describe.skipIf(!hasRg())("/api/files", () => {
	it("serves fuzzy-matched paths with their project", async () => {
		const rows = await getJson<{ path: string; project: string }[]>("/api/files?q=unitxt");
		expect(rows[0]?.path.endsWith("/alpha/src/uni.txt")).toBe(true);
		expect(rows[0]?.project).toBe("alpha");
		expect(rows.some((r) => r.path.startsWith(t.outside))).toBe(false);
	});

	it("narrows by project and honours the limit", async () => {
		const beta = await getJson<{ path: string }[]>("/api/files?project=beta");
		expect(beta.every((r) => r.path.includes("/beta/"))).toBe(true);
		expect(await getJson<unknown[]>("/api/files?limit=1")).toHaveLength(1);
		expect(await getJson<unknown[]>("/api/files?project=..")).toEqual([]);
	});
});

describe.skipIf(!hasRg())("/api/file", () => {
	it("serves the body of a tracked file so Go to File can open it", async () => {
		const rows = await getJson<{ path: string }[]>("/api/files?q=twots");
		const path = rows[0]?.path ?? "";
		expect(path.endsWith("/beta/lib/two.ts")).toBe(true);
		const body = await getJson<{ text: string; truncated: boolean; bytes: number }>(
			`/api/file?repo=${encodeURIComponent(path)}`,
		);
		expect(body.text).toContain("beta needle here");
		expect(body.truncated).toBe(false);
		expect(body.bytes).toBeGreaterThan(0);
	});

	it("refuses anything the listing does not contain, including a traversal", async () => {
		for (const target of ["", t.outsideFile, "/etc/passwd", `${t.work}/../../etc/passwd`]) {
			const reply = await call(ui.url, `/api/file?repo=${encodeURIComponent(target)}`);
			expect(reply.status, target).toBe(400);
			expect(JSON.parse(reply.body).error).toBe("not a tracked file");
		}
	});
});

describe.skipIf(!hasRg())("flusk find", () => {
	it("groups by file and states the totals", async () => {
		const { out, text } = sink();
		expect(await findCmd("needle", { out })).toBe(0);
		const printed = text();
		expect(printed).toContain("/alpha/src/uni.txt");
		expect(printed).toContain("(alpha)");
		expect(printed).toMatch(/\n\s+1: /);
		expect(printed).toMatch(/\d+ matches in \d+ files · \d+ms/);
		expect(printed).not.toContain("TRUNCATED");
	});

	it("says so in the footer when a bound cut the search short", async () => {
		const { out, text } = sink();
		expect(await findCmd("needle", { out, limit: "2" })).toBe(0);
		expect(text()).toContain("TRUNCATED");
		expect(text()).toContain("stopped at 2 matches");
	});

	it("reports no matches, and rejects a bad limit", async () => {
		const miss = sink();
		expect(await findCmd("zzzznothing", { out: miss.out })).toBe(0);
		expect(miss.text()).toBe('no matches for "zzzznothing"\n');
		const bad = sink();
		expect(await findCmd("needle", { out: bad.out, limit: "0" })).toBe(1);
		expect(bad.text()).toContain("--limit must be a positive integer");
	});
});
