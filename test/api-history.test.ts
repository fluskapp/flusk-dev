/**
 * The other half of the same feature: the three history endpoints and the
 * palette that calls them, over the loopback server. Same seeded index in a
 * temp FLUSK_HOME — no network, no model, no walk of the real machine's repos.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { saveIndex } from "../src/history/index-store.js";
import type {
	CardKind,
	ComposedPrompt,
	HistoryCard,
	SearchHit,
	Walkthrough,
} from "../src/history/types.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";

let home: string;
let ui: UiServer;
function card(id: string, kind: CardKind, over: Partial<HistoryCard> = {}): HistoryCard {
	return {
		id,
		kind,
		project: "linof-base",
		at: "2026-08-01T00:00:00.000Z",
		outcome: "shipped",
		ref: id,
		title: "add a retry hook with backoff to the queue worker",
		text: "the queue worker retries with exponential backoff",
		paths: ["src/queue/worker.ts"],
		...over,
	};
}

const CORPUS = [
	card("commit:linof-base:aaaa1111", "commit", { ref: "aaaa1111bbbb2222" }),
	card("journal:linof-base:run-9", "journal", {
		title: "retry hook rollout",
		outcome: "failed",
		ref: "/tmp/docs/runs/run-9.md",
	}),
	card("doc:linof-base:CONTRIBUTING.md", "doc", {
		title: "Contributing",
		outcome: "unknown",
		ref: "/tmp/CONTRIBUTING.md",
		paths: ["CONTRIBUTING.md"],
		text: "Tabs. Relative imports end in .js. Retry logic lives in the worker.",
	}),
];
const get = async <T>(path: string): Promise<T> => (await fetch(`${ui.url}${path}`)).json() as T;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "flusk-history-api-"));
	process.env.FLUSK_HOME = home;
	saveIndex({ cards: CORPUS, builtAt: new Date().toISOString(), stamps: {} });
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("serves search, walkthrough and prompt over the loopback API", async () => {
	const hits = await get<SearchHit[]>("/api/history/search?q=retry+hook&limit=3");
	expect(hits[0]?.terms).toContain("retry");
	expect(hits[0]?.score).toBeGreaterThanOrEqual(hits[1]?.score ?? 0); // served in rank order
	expect(hits.length).toBeLessThanOrEqual(3);
	const one = await get<SearchHit[]>("/api/history/search?q=retry&kind=journal");
	expect(one.every((h) => h.card.kind === "journal")).toBe(true);

	const walk = await get<Walkthrough>("/api/history/walkthrough?task=retry+hook");
	expect(walk.precedent.length + walk.conventions.length).toBeGreaterThan(0);
	expect(walk.traps.join(" ")).toContain("retry hook rollout");

	const prompt = await get<ComposedPrompt>("/api/history/prompt?task=retry+hook&budget=800");
	expect(prompt.blocks[0]?.source).toBe("task");
	expect(prompt.tokens).toBeGreaterThan(0);
	expect((await fetch(`${ui.url}/api/history/prompt`)).status).toBe(400);
});

it("rejects an unknown kind and honours a project scope, as the CLI does", async () => {
	const bad = await fetch(`${ui.url}/api/history/search?q=retry&kind=commits`);
	expect(bad.status).toBe(400); // `flusk search --kind commits` exits 1
	const scoped = await get<SearchHit[]>("/api/history/search?q=retry&project=nobody");
	expect(scoped).toEqual([]);
	const mine = await get<SearchHit[]>("/api/history/search?q=retry&project=linof-base");
	expect(mine.length).toBeGreaterThan(0);
});

it("ships the palette markup, its help row and its endpoints in the page", async () => {
	const page = await (await fetch(`${ui.url}/`)).text();
	const markers = [
		'id="palette"',
		'id="pal-q"',
		'id="pal-list"',
		'id="pal-compose"',
		'id="palette-help"',
		"/api/history/search?limit=30",
		"/api/history/prompt?budget=4000",
		".pal-card",
		"palScope",
		"Command palette &mdash; search all history",
	];
	for (const marker of markers) expect(page).toContain(marker);
	expect(page.split("</script>")).toHaveLength(2); // still one script element
});
