/**
 * The dashboard can now spawn agent CLIs and reach the network, so the only
 * thing between a hostile page and the user's machine is this guard. Each
 * defence gets a test that sends exactly what an attacker would.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call, post, sseChunks } from "./api-http.js";
import { journal, type Tree, tree } from "./project-fixture.js";

let t: Tree;
let ui: UiServer;
let origin: string;
let project: string;

beforeAll(async () => {
	t = tree();
	project = join(t.work, "proj-a");
	journal(project, "2026-08-01-run", { title: "Run: one", date: "2026-08-01", status: "done" });
	writeFileSync(
		join(t.home, "config.json"),
		JSON.stringify({ ui: t.cfg.ui, memory: { enabled: false } }),
	);
	ui = await startUiServer(0);
	origin = ui.url;
});

afterAll(async () => {
	await ui.close();
	t.cleanup();
});

it("refuses a Host header that is not this loopback server (DNS rebinding)", async () => {
	for (const host of ["evil.example", "evil.example:80", "127.0.0.1.nip.io"]) {
		const res = await call(ui.url, "/api/projects", { headers: { host } });
		expect(res.status).toBe(403);
		expect(res.body).toContain("Host");
	}
	const wrongPort = await call(ui.url, "/api/projects", { headers: { host: "127.0.0.1:1" } });
	expect(wrongPort.status).toBe(403);
});

it("refuses a cross-site Origin, on reads and on chat alike", async () => {
	const headers = { origin: "http://evil.example" };
	expect((await call(ui.url, "/api/projects", { headers })).status).toBe(403);
	const chat = await post(
		ui.url,
		"/api/chat",
		{ backendId: "claude", messages: [{ role: "user", content: "hi" }], cwd: project },
		headers,
	);
	expect(chat.status).toBe(403);
	expect(chat.body).toContain("cross-origin");
});

it("refuses a chat cwd that is not a known project", async () => {
	for (const cwd of ["/etc", tmpdir(), join(project, "..")]) {
		const res = await post(ui.url, "/api/chat", {
			backendId: "claude",
			messages: [{ role: "user", content: "hi" }],
			cwd,
		});
		expect(res.status).toBe(400);
		expect(res.body).toContain("known project path");
	}
});

it("rejects a malformed chat body before anything is spawned", async () => {
	const bad = await post(ui.url, "/api/chat", { backendId: "", messages: [] });
	expect(bad.status).toBe(400);
	const noMessages = await post(ui.url, "/api/chat", { backendId: "claude", messages: [] });
	expect(noMessages.status).toBe(400);
});

it("refuses a cross-site request even when it carries no Origin", async () => {
	// A navigation or an <iframe> sends no Origin at all; Sec-Fetch-Site is the
	// only thing that distinguishes it from the dashboard's own GET.
	const framed = await call(ui.url, "/", { headers: { "sec-fetch-site": "cross-site" } });
	expect(framed.status).toBe(403);
	expect(framed.body).toContain("cross-site");
	const same = await call(ui.url, "/", { headers: { "sec-fetch-site": "same-origin" } });
	expect(same.status).toBe(200);
});

it("forbids framing the dashboard, which can spawn agent CLIs", async () => {
	const page = await call(ui.url, "/");
	expect(page.headers["x-frame-options"]).toBe("DENY");
	expect(page.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
	expect(page.headers["content-security-policy"]).toContain("base-uri 'none'");
});

it("serves a same-origin request, including a chat in a known project", async () => {
	const list = await call(ui.url, "/api/projects", { headers: { origin } });
	expect(list.status).toBe(200);
	expect((JSON.parse(list.body) as { name: string }[]).map((p) => p.name)).toContain("proj-a");

	// A backend id that resolves to nothing: proof the cwd passed the check
	// without this test ever spawning a real agent CLI.
	const chat = await post(
		ui.url,
		"/api/chat",
		{ backendId: "no-such-backend", messages: [{ role: "user", content: "hi" }], cwd: project },
		{ origin },
	);
	expect(chat.status).toBe(200);
	const frames = sseChunks(chat.body);
	expect(frames[0]).toMatchObject({ type: "meta" });
	expect(frames.slice(1)).toEqual([
		{ type: "error", message: "unknown chat backend: no-such-backend" },
		{ type: "done" },
	]);
});
