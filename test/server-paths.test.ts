/**
 * What the dashboard will read off disk, and what it will accept in a body.
 *
 * Both are the same question in different clothes: the server serves files
 * and spawns processes, so every path a request can name has to be one the
 * scanner already published — never merely one that looks like it lives in
 * the right directory.
 */
import { symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { journal, type Tree, tree, write } from "./project-fixture.js";

let t: Tree;
let ui: UiServer;
let project: string;
let indexedJournal: string;

beforeAll(async () => {
	t = tree();
	project = join(t.work, "proj-a");
	indexedJournal = journal(project, "2026-08-01-run", {
		title: "Run: one",
		date: "2026-08-01",
		status: "done",
	});
	// A file the scanner never indexed, and a symlink to it planted where the
	// journals live — the two shapes a lexical prefix check lets through.
	const secret = write(t.work, "secret.txt", "BEGIN OPENSSH PRIVATE KEY\n");
	symlinkSync(secret, join(project, "docs", "runs", "leak.md"));
	write(project, join("docs", "runs", "notes.txt"), "not a journal\n");
	writeFileSync(
		join(t.home, "config.json"),
		JSON.stringify({ ui: t.cfg.ui, memory: { enabled: false } }),
	);
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	t.cleanup();
});

it("serves only journals the scanner indexed — not symlinks, not stray files", async () => {
	const leak = `/api/journal?repo=${encodeURIComponent(join(project, "docs", "runs", "leak.md"))}`;
	const leaked = await call(ui.url, leak);
	expect(leaked.status).toBe(400);
	expect(leaked.body).not.toContain("PRIVATE KEY");
	const stray = join(project, "docs", "runs", "notes.txt");
	expect((await call(ui.url, `/api/journal?repo=${encodeURIComponent(stray)}`)).status).toBe(400);
	// ...and the real journal still reads.
	const ok = await call(ui.url, `/api/journal?repo=${encodeURIComponent(indexedJournal)}`);
	expect(ok.status).toBe(200);
	expect(ok.body).toContain("Run: one");
	// The same rule guards its metadata route.
	expect((await call(ui.url, `/api/journal-meta?repo=${encodeURIComponent(leak)}`)).status).toBe(
		400,
	);
	const meta = await call(ui.url, `/api/journal-meta?repo=${encodeURIComponent(indexedJournal)}`);
	expect(JSON.parse(meta.body)).toMatchObject({ status: "done", path: indexedJournal });
});

it("serves an indexed document's SOURCE as well as its html", async () => {
	// Without `text` the client computes hasRaw === false, so Split and Raw are
	// disabled on every document tab while the help sheet still advertises
	// s / R — the keys are swallowed and nothing happens.
	const doc = write(project, "README.md", "# Title\n\nbody text\n");
	const reply = await call(ui.url, `/api/artifact?repo=${encodeURIComponent(doc)}`);
	expect(reply.status).toBe(200);
	const payload = JSON.parse(reply.body) as Record<string, unknown>;
	expect(payload.text).toBe("# Title\n\nbody text\n");
	expect(String(payload.html)).toContain("<h1>Title</h1>");
	// the containment rule is unchanged: only what the scanner indexed
	const stray = join(t.work, "secret.txt");
	const denied = await call(ui.url, `/api/artifact?repo=${encodeURIComponent(stray)}`);
	expect(denied.status).toBe(400);
	expect(denied.body).not.toContain("PRIVATE KEY");
});

it("answers an over-size chat body instead of resetting the connection", async () => {
	const huge = JSON.stringify({
		backendId: "claude",
		messages: [{ role: "user", content: "x".repeat(2_000_000) }],
	});
	const res = await call(ui.url, "/api/chat", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: huge,
	});
	expect(res.status).toBe(413);
	expect(res.body).toContain("too large");
});

it("refuses /api/memory for a directory that is not a known project", async () => {
	// buildMemoryView loads that directory's config, and a config decides which
	// server the user's memory.apiKey is sent to.
	for (const repo of ["/etc", tmpdir(), join(project, "..")]) {
		const res = await call(ui.url, `/api/memory?repo=${encodeURIComponent(repo)}`);
		expect(res.status).toBe(400);
		expect(res.body).toContain("known project");
	}
});
