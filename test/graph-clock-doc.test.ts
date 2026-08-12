/**
 * The doc branch of the history clock, joined the way production actually mints
 * doc cards.
 *
 * `docCard` (src/history/sources.ts) sets `ref` to the artifact's ABSOLUTE path
 * and `paths` to its repo-relative one, while `build-history.ts` mints the node
 * as `doc:<project>/<rel>`. The clock used to refuse any absolute ref outright,
 * so its doc branch was dead in production: every `documents` row came back
 * undated while the report still said its order was chronological. The existing
 * suite missed it because its fixture uses a relative ref no real card carries.
 */
import { expect, it } from "vitest";
import { historyClock } from "../src/features/graph/history-clock.js";
import type { HistoryCard } from "../src/features/history/types.js";

const AT = "2026-03-01T00:00:00.000Z";

const docCardLike = (over: Partial<HistoryCard> = {}): HistoryCard => ({
	id: "doc:proj:docs/notes.md",
	kind: "doc",
	project: "proj",
	title: "Notes",
	text: "",
	at: AT,
	paths: ["docs/notes.md"],
	outcome: "unknown",
	ref: "/abs/checkout/proj/docs/notes.md",
	...over,
});

const node = (id: string) => ({ id, kind: "doc" as const, label: "Notes" });

it("dates a doc card whose ref is absolute, as every real one is", () => {
	const clock = historyClock([docCardLike()]);
	const stamp = clock(node("doc:proj/docs/notes.md"));
	expect(stamp.at).toBe(AT);
	expect(stamp.ref).toBe("/abs/checkout/proj/docs/notes.md");
});

it("still dates a relative ref, and still refuses to guess from nothing", () => {
	const clock = historyClock([
		docCardLike({ ref: "docs/notes.md", paths: [] }),
		docCardLike({ id: "doc:proj:x", ref: "/abs/x.md", paths: [] }),
	]);
	expect(clock(node("doc:proj/docs/notes.md")).at).toBe(AT);
	// No relative path anywhere on the card: a guess would be worse than a null.
	expect(clock(node("doc:proj/x.md"))).toEqual({ at: null, ref: null });
});

it("keeps the newest version of a doc, not its first", () => {
	const older = docCardLike({ at: "2025-01-01T00:00:00.000Z" });
	const clock = historyClock([older, docCardLike()]);
	expect(clock(node("doc:proj/docs/notes.md")).at).toBe(AT);
});
