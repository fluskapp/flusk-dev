/**
 * The tab strip's route → tab mapping. A tab is a document's identity: a
 * journal tab carries the run's name (filename minus timestamp prefix), never
 * a generic "run base.md"; a session tab carries its short id; list routes
 * are windows, not documents, and get no tab.
 */
import { expect, it } from "vitest";
import { tabOf } from "../src/ui/react/workbench/Tabs.js";

const enc = (ref: string): string => `/runs/${encodeURIComponent(ref)}`;

it("titles a journal tab with the run's name, not the filename's last dash part", () => {
	const path = "/w/h/docs/runs/2026-08-16-15-37-39-review-pr-288-adirbenyossef-linof-base.md";
	const tab = tabOf(enc(path));
	expect(tab?.title).toBe("review-pr-288-adirbenyossef-linof-base");
	expect(tab?.icon).toBe("run");
	expect(tab?.backTo).toBe("/runs");
});

it("survives a doubly encoded pathname — a stale link the router encoded again", () => {
	const path = "/w/h/docs/runs/2026-08-16-15-37-39-review-pr-242-adirbenyossef-linof-base.md";
	const tab = tabOf(`/runs/${encodeURIComponent(encodeURIComponent(path))}`);
	expect(tab?.title).toBe("review-pr-242-adirbenyossef-linof-base");
});

it("keeps a journal name that has no timestamp prefix whole", () => {
	expect(tabOf(enc("/w/h/docs/runs/nightly.md"))?.title).toBe("nightly");
});

it("titles a session tab with its short id", () => {
	const tab = tabOf(enc("proj/2026-08-10T10-00-00-abc123.jsonl"));
	expect(tab?.title).toBe("run abc123");
	expect(tab?.backTo).toBe("/runs");
});

it("titles a live run by its id", () => {
	expect(tabOf("/runs/f53b567d")?.title).toBe("run f53b567d");
});

it("maps doc, file and project details; list routes get no tab", () => {
	expect(tabOf("/read/guide.md")?.title).toBe("guide.md");
	expect(tabOf("/projects/linof")?.backTo).toBe("/");
	expect(tabOf("/runs")).toBeNull();
	expect(tabOf("/docs")).toBeNull();
});
