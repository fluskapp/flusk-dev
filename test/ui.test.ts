import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { Session } from "../src/features/session/session-file.repository.js";
import { repoSlug } from "../src/platform/paths/paths.js";
import type { SessionDetail } from "../src/features/projects/detail.js";
import { scanSessions } from "../src/features/projects/scan.repository.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";

let home: string;
let repo: string;
let ui: UiServer;
const model = { provider: "fake", id: "fake-1", contextWindow: 200_000 };

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "flusk-ui-home-"));
	repo = mkdtempSync(join(tmpdir(), "flusk-ui-repo-"));
	process.env.FLUSK_HOME = home;
	const s = Session.create({ task: "polish the dashboard", repoRoot: repo, model });
	s.appendMessage({ role: "user", content: "polish the dashboard" });
	s.appendMessage({
		role: "assistant",
		content: [
			{ type: "toolCall", id: "t1", name: "bash", args: { command: "ls" } },
		],
		stopReason: "toolUse",
		usage: { input: 10, output: 5, cacheRead: 0, costUsd: 0.001 },
	});
	s.appendMessage({ role: "toolResult", callId: "t1", name: "bash", output: "README.md", isError: false });
	s.appendMessage({
		role: "assistant",
		content: [{ type: "text", text: "All done." }],
		stopReason: "end",
		usage: { input: 12, output: 6, cacheRead: 0, costUsd: 0.001 },
	});
	s.appendStats({
		turns: 2,
		usage: { input: 22, output: 11, cacheRead: 0, costUsd: 0.002 },
		startedAt: "2026-08-10T10:00:00.000Z",
		endedAt: "2026-08-10T10:01:00.000Z",
	});
	s.close();
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
	rmSync(repo, { recursive: true, force: true });
});

it("scan finds the session with derived status and stats", () => {
	const list = scanSessions();
	expect(list).toHaveLength(1);
	const s = list[0];
	expect(s?.task).toBe("polish the dashboard");
	expect(s?.status).toBe("completed");
	expect(s?.turns).toBe(2);
	expect(s?.costUsd).toBeCloseTo(0.002);
	expect(s?.key.startsWith(`${repoSlug(repo)}/`)).toBe(true);
});

it("serves the IntelliJ-styled page and the sessions API", async () => {
	const page = await (await fetch(`${ui.url}/`)).text();
	expect(page).toContain("<title>flusk</title>");
	expect(page).toContain("JetBrains Mono");
	expect(page).toContain("data-theme");
	const list = (await (await fetch(`${ui.url}/api/sessions`)).json()) as unknown[];
	expect(list).toHaveLength(1);
});

it("serves session detail with tool results joined to calls", async () => {
	const key = scanSessions()[0]?.key ?? "";
	const res = await fetch(`${ui.url}/api/session?k=${encodeURIComponent(key)}`);
	expect(res.status).toBe(200);
	const d = (await res.json()) as SessionDetail & { path: string };
	expect(d.path.endsWith(".jsonl")).toBe(true);
	expect(d.status).toBe("completed");
	expect(d.items[0]).toEqual({ kind: "user", text: "polish the dashboard" });
	const turn = d.items[1];
	if (turn?.kind !== "assistant") throw new Error("expected assistant item");
	expect(turn.tools[0]).toMatchObject({ name: "bash", output: "README.md", isError: false });
	expect(d.stats?.turns).toBe(2);
});

it("rejects path traversal and bad keys", async () => {
	for (const k of ["../../etc/passwd", "a/../../x.jsonl", "nope", "a/b/c.jsonl"]) {
		const res = await fetch(`${ui.url}/api/session?k=${encodeURIComponent(k)}`);
		expect(res.status).toBe(400);
	}
	expect((await fetch(`${ui.url}/api/nope`)).status).toBe(404);
});

it("reveal validates keys and method", async () => {
	const bad = await fetch(`${ui.url}/api/reveal?k=..%2Fescape.jsonl`, { method: "POST" });
	expect(bad.status).toBe(400);
	const wrongMethod = await fetch(`${ui.url}/api/reveal?k=a%2Fb.jsonl`);
	expect(wrongMethod.status).toBe(404);
});

it("page ships search, help overlay, and keyboard client", async () => {
	const page = await (await fetch(`${ui.url}/`)).text();
	for (const marker of ['id="search"', 'id="help"', 'id="toast"', "<kbd>j</kbd>", "copy-nvim"]) {
		expect(page).toContain(marker);
	}
});
