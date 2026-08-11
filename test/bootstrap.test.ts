import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { AhConfig } from "../src/config/types.js";
import { AbagraphMemoryPort } from "../src/memory/abagraph-port.js";
import { createMemory } from "../src/memory/bootstrap.js";
import { noopMemory } from "../src/memory/port.js";
import { repoSlug } from "../src/session/paths.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome, writeHomeConfig } from "./helpers.js";
import { startMockAbagraph } from "./mock-abagraph.js";

let repo: string;
beforeEach(async () => {
	repo = await setupTestHome("ah-bootstrap-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

/** Nothing listens on the discard port; health fails fast. */
const DEAD_URL = "http://127.0.0.1:9";

function cfgWith(memory: Partial<AhConfig["memory"]>): AhConfig {
	const cfg = structuredClone(DEFAULT_CONFIG);
	cfg.memory = { ...cfg.memory, ...memory };
	return cfg;
}

function spyStderr(): { errs: string[]; restore: () => void } {
	const errs: string[] = [];
	const spy = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
		errs.push(String(chunk));
		return true;
	}) as never);
	return { errs, restore: () => spy.mockRestore() };
}

test("memory.enabled false → noopMemory, null client, no warning", async () => {
	const warnings: string[] = [];
	const mem = await createMemory(cfgWith({ enabled: false }), repo, undefined, (l) => warnings.push(l));
	expect(mem.port).toBe(noopMemory);
	expect(mem.client).toBeNull();
	expect(mem.ns).toBe(`repo:${repoSlug(repo)}`);
	expect(warnings).toEqual([]);
});

test("unreachable server without autoSpawn degrades to noop with ONE warning", async () => {
	const warnings: string[] = [];
	const cfg = cfgWith({ enabled: true, baseUrl: DEAD_URL, autoSpawn: false });
	const mem = await createMemory(cfg, repo, undefined, (l) => warnings.push(l));
	expect(mem.port).toBe(noopMemory);
	expect(mem.client).toBeNull();
	expect(warnings).toEqual([
		`memory: abagraph unreachable at ${DEAD_URL} — running without memory\n`,
	]);
});

test("reachable server → AbagraphMemoryPort + client bound to the resolved namespace", async () => {
	const mock = await startMockAbagraph();
	try {
		const warnings: string[] = [];
		const cfg = cfgWith({ enabled: true, baseUrl: mock.url });
		const mem = await createMemory(cfg, repo, { namespace: "repo:custom" }, (l) => warnings.push(l));
		expect(mem.port).toBeInstanceOf(AbagraphMemoryPort);
		expect(mem.ns).toBe("repo:custom"); // .ah.json namespace override wins
		expect(warnings).toEqual([]);
		// namespace discipline: writes through the returned client are stamped
		await mem.client?.transact(mem.ns, [
			{ subject: "Repo:custom", predicate: "convention", object: "tabs" },
		]);
		expect(mock.dump("repo:custom")).toHaveLength(1);
	} finally {
		await mock.close();
	}
});

test("run with memory enabled but unreachable warns on stderr and still completes", async () => {
	await writeHomeConfig({ memory: { enabled: true, baseUrl: DEAD_URL } });
	const err = spyStderr();
	try {
		const cap = capture();
		const outcome = await runCmd({ task: "demo", repo, out: cap.out });
		expect(outcome).toBe("completed");
		expect(cap.text()).toContain("done completed");
		expect(err.errs.join("")).toContain(`memory: abagraph unreachable at ${DEAD_URL}`);
	} finally {
		err.restore();
	}
}, SLOW);

test("quiet run keeps stderr clean even while memory degrades", async () => {
	await writeHomeConfig({ memory: { enabled: true, baseUrl: DEAD_URL } });
	const err = spyStderr();
	try {
		const cap = capture();
		const outcome = await runCmd({ task: "demo", repo, quiet: true, out: cap.out });
		expect(outcome).toBe("completed");
		expect(err.errs.join("")).toBe("");
	} finally {
		err.restore();
	}
}, SLOW);
