/**
 * The feed cap must never distort single-journal reads or counts: a journal
 * past scanJournals' per-dir slice still resolves through journalAt (a stale
 * tab or an old link has to render and reveal), the symlink escape stays
 * refused, and countJournals reports what readdir sees, not the capped slice.
 */
import { symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { countJournals, journalAt } from "../src/features/projects/journal-lookup.repository.js";
import { scanJournals } from "../src/features/projects/journal-scan.repository.js";
import { journal, tree } from "./project-fixture.js";

let t: ReturnType<typeof tree>;
let harness: string;
let oldest: string;
const front = (title: string, date: string) => ({ title: `"${title}"`, date, status: "done" });

beforeAll(() => {
	t = tree();
	harness = join(t.work, "linof");
	oldest = journal(harness, "2026-08-01-aaa", front("Run: aaa", "2026-08-01T10:00:00.000Z"));
	journal(harness, "2026-08-02-bbb", front("Run: bbb", "2026-08-02T10:00:00.000Z"));
	journal(harness, "2026-08-03-ccc", front("Run: ccc", "2026-08-03T10:00:00.000Z"));
});

afterAll(() => t.cleanup());

it("resolves a journal the per-dir cap dropped from the feed", () => {
	const dirs = t.cfg.ui.harnessDirs;
	const feed = scanJournals(dirs, 1);
	expect(feed.map((j) => j.path)).not.toContain(oldest); // capped out of the feed
	const found = journalAt(dirs, oldest);
	expect(found?.path).toBe(oldest);
	expect(found?.title).toBe("Run: aaa");
	expect(found?.harnessRoot).toBe(harness);
});

it("reads a capped-out journal identically to an indexed one", () => {
	const [indexed] = scanJournals(t.cfg.ui.harnessDirs, 400);
	expect(journalAt(t.cfg.ui.harnessDirs, indexed?.path ?? "")).toEqual(indexed);
});

it("refuses a symlink under docs/runs that resolves elsewhere", () => {
	const outside = join(t.home, "outside.md");
	writeFileSync(outside, "---\ntitle: escape\n---\n");
	const link = join(harness, "docs", "runs", "2026-08-04-link.md");
	symlinkSync(outside, link);
	expect(journalAt(t.cfg.ui.harnessDirs, link)).toBeNull();
	expect(journalAt(t.cfg.ui.harnessDirs, outside)).toBeNull();
});

it("refuses paths outside a journal dir, non-.md files, and the missing", () => {
	expect(journalAt(t.cfg.ui.harnessDirs, "")).toBeNull();
	expect(journalAt(t.cfg.ui.harnessDirs, join(harness, "README.md"))).toBeNull();
	expect(journalAt(t.cfg.ui.harnessDirs, join(harness, "docs", "runs", "nope.md"))).toBeNull();
	expect(journalAt(t.cfg.ui.harnessDirs, oldest.replace(/\.md$/, ""))).toBeNull();
});

it("counts journals from readdir, however small the feed cap", () => {
	const counts = countJournals(t.cfg.ui.harnessDirs);
	// 3 real journals + the escape symlink readdir still lists.
	expect(counts.get(harness)).toBe(4);
	expect(scanJournals(t.cfg.ui.harnessDirs, 1).length).toBe(1);
});
