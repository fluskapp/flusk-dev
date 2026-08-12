import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import {
	INDEX_VERSION,
	type IndexSource,
	indexDir,
	indexPath,
	loadIndex,
	refreshIndex,
} from "../src/features/history/index-store.repository.js";
import type { HistoryCard } from "../src/features/history/types.js";

let home: string;
const previousHome = process.env.FLUSK_HOME;

beforeEach(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-history-index-"));
	process.env.FLUSK_HOME = home;
});

afterEach(() => {
	if (previousHome === undefined) delete process.env.FLUSK_HOME;
	else process.env.FLUSK_HOME = previousHome;
	rmSync(home, { recursive: true, force: true });
});

function makeCard(id: string, title: string): HistoryCard {
	return {
		id,
		kind: "commit",
		project: "demo",
		title,
		text: title,
		at: "2026-08-01T00:00:00.000Z",
		paths: ["src/demo.ts"],
		outcome: "shipped",
		ref: id,
	};
}

/** A source whose stamp and cards are controlled, and whose loads are counted. */
function fakeSource(id: string, stamp: string, cards: HistoryCard[]) {
	const state = { stamp, cards, loads: 0 };
	const source: IndexSource = {
		id,
		stamp: () => state.stamp,
		load: () => {
			state.loads++;
			return state.cards;
		},
	};
	return { source, state };
}

it("builds, saves and loads an index round-trip", () => {
	const a = fakeSource("commits:demo", "oid-1", [makeCard("commit:demo:aaa", "add retry hook")]);
	const b = fakeSource("docs:demo", "mtime-1", [makeCard("doc:demo:readme", "conventions")]);
	const built = refreshIndex([a.source, b.source]);
	expect(built.cards.map((c) => c.id).sort()).toEqual(["commit:demo:aaa", "doc:demo:readme"]);
	expect(built.stamps).toEqual({ "commits:demo": "oid-1", "docs:demo": "mtime-1" });
	const loaded = loadIndex();
	expect(loaded?.cards).toEqual(built.cards);
	expect(loaded?.stamps).toEqual(built.stamps);
	expect(loaded?.builtAt).toBe(built.builtAt);
});

it("reloads only the sources whose stamp moved", () => {
	const a = fakeSource("commits:demo", "oid-1", [makeCard("commit:demo:aaa", "first")]);
	const b = fakeSource("docs:demo", "mtime-1", [makeCard("doc:demo:readme", "conventions")]);
	refreshIndex([a.source, b.source]);
	expect([a.state.loads, b.state.loads]).toEqual([1, 1]);

	refreshIndex([a.source, b.source]); // nothing changed
	expect([a.state.loads, b.state.loads]).toEqual([1, 1]);

	a.state.stamp = "oid-2";
	a.state.cards = [makeCard("commit:demo:aaa", "first"), makeCard("commit:demo:bbb", "second")];
	const after = refreshIndex([a.source, b.source]);
	expect([a.state.loads, b.state.loads]).toEqual([2, 1]); // only the moved source
	expect(after.cards).toHaveLength(3);

	const dropped = refreshIndex([b.source]); // a source that leaves takes its cards
	expect(dropped.cards.map((c) => c.id)).toEqual(["doc:demo:readme"]);
});

it("rebuilds from scratch when the cache is corrupt or a version behind", () => {
	const a = fakeSource("commits:demo", "oid-1", [makeCard("commit:demo:aaa", "first")]);
	const built = refreshIndex([a.source]);

	writeFileSync(indexPath(), "{not json at all");
	expect(loadIndex()).toBeNull();

	writeFileSync(indexPath(), JSON.stringify({ ...built, version: INDEX_VERSION + 1 }));
	expect(loadIndex()).toBeNull(); // a version behind is a rebuild, not a failure

	const rebuilt = refreshIndex([a.source]);
	expect(rebuilt.cards.map((c) => c.id)).toEqual(["commit:demo:aaa"]);
	expect(loadIndex()?.cards).toHaveLength(1);
});

it("re-reads a source whose shard is corrupt, even with an unchanged stamp", () => {
	const a = fakeSource("commits:demo", "oid-1", [makeCard("commit:demo:aaa", "first")]);
	refreshIndex([a.source]);
	expect(a.state.loads).toBe(1);

	const shards = join(indexDir(), "sources");
	for (const file of readdirSync(shards)) writeFileSync(join(shards, file), "garbage");
	const after = refreshIndex([a.source]);
	expect(a.state.loads).toBe(2);
	expect(after.cards.map((c) => c.id)).toEqual(["commit:demo:aaa"]);
});

it("survives a source that throws by keeping its cached cards", () => {
	const a = fakeSource("commits:demo", "oid-1", [makeCard("commit:demo:aaa", "first")]);
	const b = fakeSource("docs:demo", "mtime-1", [makeCard("doc:demo:readme", "conventions")]);
	refreshIndex([a.source, b.source]);

	a.state.stamp = "oid-2";
	const angry: IndexSource = {
		id: "commits:demo",
		stamp: () => "oid-2",
		load: () => {
			throw new Error("git exploded");
		},
	};
	const after = refreshIndex([angry, b.source]);
	expect(after.cards.map((c) => c.id).sort()).toEqual(["commit:demo:aaa", "doc:demo:readme"]);
});
