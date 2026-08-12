/**
 * The leash on the language service, which is the expensive half of the doc
 * feature: one live service at a time, a warm-up state a caller can render
 * instead of hanging, and a refusal for projects too large to index.
 *
 * These are cost claims, so they are asserted directly rather than inferred
 * from a passing lookup — an unbounded service still answers correctly, it
 * just eats the machine while doing it.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { createTsProvider } from "../src/features/docs/ts-provider.js";
import {
	disposeService,
	getService,
	loadTypeScript,
	serviceStatus,
} from "../src/features/docs/ts-service.js";
import { docProject } from "./doc-fixture.js";

afterEach(() => disposeService());

it("keeps a small LRU of services and disposes the least recently used", async () => {
	const a = docProject();
	const b = docProject();
	const c = docProject();
	const opts = { fileCap: 50, maxServices: 2 };
	const first = await getService(a.root, opts);
	expect(first).not.toBeNull();
	expect(serviceStatus()).toMatchObject({ state: "indexing", root: a.root, files: 2 });
	// The first call is the one that builds the program: state becomes ready.
	expect(first?.run((ls) => ls.getNavigationTree(a.greet).text).ok).toBe(true);
	expect(serviceStatus().state).toBe("ready");
	expect(first?.ready()).toBe(true);

	const second = await getService(b.root, opts);
	expect(second).not.toBe(first);
	expect(serviceStatus()).toMatchObject({ state: "indexing", root: b.root });
	// Two projects is the workflow, so A is still alive: alternating clicks
	// between two open repos must not rebuild a whole program each way.
	expect(first?.run((ls) => ls.getNavigationTree(a.greet)).ok).toBe(true);
	expect(await getService(a.root, opts)).toBe(first);
	// Re-asking for the same root reuses the service rather than rebuilding it.
	expect(await getService(b.root, opts)).toBe(second);

	// A third project evicts the least recently USED — A, since B was touched
	// last — and the evicted service is dead: ts's own dispose() only drops the
	// program, so a stale handle would otherwise rebuild it and take the memory
	// back. B, the one still in use, survives.
	const third = await getService(c.root, opts);
	expect(third).not.toBe(first);
	const dead = first?.run((ls) => ls.getNavigationTree(a.greet));
	expect(dead?.ok).toBe(false);
	expect(dead?.ok === false && dead.reason).toContain("closed");
	// A dead handle cannot rewrite the live project's status, which is what
	// makes "indexing…" trustworthy in the UI.
	expect(serviceStatus()).toMatchObject({ state: "indexing", root: c.root });
	// B, the one still in use, survives the eviction and still answers.
	expect(second?.run((ls) => ls.getNavigationTree(b.greet)).ok).toBe(true);
	for (const p of [a, b, c]) p.cleanup();
});

it("serialises overlapping builds so neither caller gets a dead service", async () => {
	// The identity check used to run BEFORE `await loadTypeScript()`, so two
	// concurrent lookups for different roots both proceeded and the loser was
	// handed an already-disposed service whose every call answered null — a
	// silent "no symbol at this position" for whichever project lost the race.
	const a = docProject();
	const b = docProject();
	const opts = { fileCap: 50, maxServices: 2 };
	const [one, two, again] = await Promise.all([
		getService(a.root, opts),
		getService(b.root, opts),
		getService(a.root, opts),
	]);
	expect(one).not.toBeNull();
	expect(one).toBe(again); // one build per root, not one per caller
	expect(one?.run(() => 1)).toEqual({ ok: true, value: 1 });
	expect(two?.run(() => 1)).toEqual({ ok: true, value: 1 });
	a.cleanup();
	b.cleanup();
});

it("refuses an over-cap project without building anything", async () => {
	const big = docProject({ "a.ts": "export const a = 1;\n", "b.ts": "export const b = 2;\n" });
	expect(await getService(big.root, { fileCap: 3 })).toBeNull();
	expect(serviceStatus()).toMatchObject({
		state: "refused",
		root: big.root,
		reason: "project has more than 3 source files — too large to index",
	});
	// Under the cap the same project is fine: the cap is the only thing refusing.
	expect(await getService(big.root, { fileCap: 10 })).not.toBeNull();
	big.cleanup();
});

it("documents a file created after the service started", async () => {
	// The file set is snapshotted at startup, so without `include` the first
	// lookup in a just-written file answers "outside the project".
	const p = docProject();
	const made = await createTsProvider(p.root, { fileCap: 50 });
	expect(made.ok).toBe(true);
	const fresh = join(p.root, "src", "fresh.ts");
	writeFileSync(fresh, "export const answer = 42;\n");
	if (made.ok) {
		expect(await made.provider.docAt(fresh, 1, 14)).toMatchObject({
			name: "answer",
			signature: "const answer: 42",
		});
		made.provider.dispose();
	}
	p.cleanup();
});

it("loads typescript dynamically, so its absence is a value not a crash", async () => {
	// Present here; the point is that nothing at module scope imported it, so a
	// machine without typescript gets `null` from this call and a reason from
	// `serviceStatus()` instead of an import-time failure.
	expect(await loadTypeScript()).not.toBeNull();
	const missing = docProject();
	await getService(missing.root, { fileCap: 50 });
	expect(serviceStatus().reason).toBeUndefined();
	missing.cleanup();
});
