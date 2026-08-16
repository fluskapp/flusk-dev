/**
 * SSR smoke over the BUILT app: every route must answer 200 with real content
 * before hydration — the parity checklist's per-route assertion, runnable in
 * CI right after `npm run build:app`. Skips honestly when dist-app is absent
 * (unit-test-only runs), because asserting against nothing proves nothing.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const DIST = join(process.cwd(), "dist-app", "server", "server.js");
const describeApp = existsSync(DIST) ? describe : describe.skip;

interface Handler {
	fetch(req: Request): Promise<Response>;
}

let handler: Handler | undefined;

async function get(path: string): Promise<{ status: number; body: string; location: string }> {
	if (handler === undefined) handler = (await import(DIST)).default as Handler;
	const res = await handler.fetch(new Request(`http://127.0.0.1${path}`));
	return { status: res.status, body: await res.text(), location: res.headers.get("location") ?? "" };
}

/** Route → a marker that only the real (non-stub) page carries. */
const ROUTES: Array<[string, string]> = [
	["/", 'id="overview"'],
	["/runs", 'id="runs"'],
	["/docs", 'id="docs"'],
	["/graph", 'id="graph"'],
	["/web", 'id="web"'],
	["/chat", "chat"],
];

/** Gone as windows (docs/experience.md): their routes redirect, links survive. */
const REDIRECTS: Array<[string, string]> = [
	["/ask", "/chat"],
	["/flows", "/runs"],
];

describeApp("app SSR", () => {
	afterAll(() => {
		// The handler owns nothing persistent, but Nitro keeps timers alive in
		// some configurations; nothing to close today.
	});

	it("the chrome is server-rendered: toolbar, rail, status bar", async () => {
		const { status, body } = await get("/");
		expect(status).toBe(200);
		expect(body).toContain('id="toolbar"');
		expect(body).toContain('id="side"');
		expect(body).toContain('id="status"');
		expect(body).toContain("flusk v");
	});

	for (const [path, marker] of ROUTES) {
		it(`${path} answers 200 with content before hydration`, async () => {
			const { status, body } = await get(path);
			expect(status).toBe(200);
			expect(body, `${path} missing ${marker}`).toContain(marker);
		});
	}

	for (const [path, to] of REDIRECTS) {
		it(`${path} redirects to ${to} — the window is gone, the link is not`, async () => {
			const { status, location } = await get(path);
			expect([301, 302, 307, 308], `${path} did not redirect`).toContain(status);
			expect(location, `${path} points somewhere else`).toContain(to);
		});
	}

	it("a run DETAIL url renders the detail shell, never the list (the nested-route bug)", async () => {
		// runs.$runId once nested under /runs with no Outlet: the detail URL
		// silently drew the list. The ref here is fake — what matters is WHICH
		// route answers.
		const { status, body } = await get("/runs/no-such-slug%2Fno-such-file.jsonl");
		expect(status).toBe(200);
		expect(body).not.toContain("All runs");
	});

	it("an unknown route is not a crash", async () => {
		const { status } = await get("/no-such-window");
		expect([200, 404]).toContain(status);
	});
});
