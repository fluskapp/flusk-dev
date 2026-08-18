/**
 * recordGate: the gate's durable record. The session entry is always written —
 * sessions do not depend on memory — and the facts of record only when a store
 * exists; a refusing ledger warns instead of suppressing the entry.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { recordGate } from "../src/cli/gate-record.js";
import type { GateOpts } from "../src/cli/gate-loop.js";
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import type { FactInput, FactStore } from "../src/features/facts/types.js";
import type { Agent } from "../src/features/run/options.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { SessionStore } from "../src/features/session/session.repository.js";
import { capture } from "./cli2-helpers.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
let sess: Session;
beforeEach(async () => {
	repo = await setupTestHome("flusk-gate-record-");
	sess = Session.create({ task: "t", repoRoot: repo, model: fakeModel });
});
afterEach(() => {
	sess.close();
	teardownTestHome();
});

const agent = () => ({ session: sess }) as unknown as Agent;

function capturing(): { store: FactStore; captured: FactInput[] } {
	const captured: FactInput[] = [];
	const store: FactStore = {
		query: async () => [],
		transact: async (_ns, f) => {
			captured.push(...f);
			return { tx: 1, ids: [] };
		},
	};
	return { store, captured };
}

const refusing: FactStore = {
	query: async () => [],
	transact: async () => {
		throw new Error("EACCES: permission denied");
	},
};

function opts(store: FactStore | null, out: NodeJS.WritableStream): GateOpts {
	return { cfg: DEFAULT_CONFIG, repoRoot: repo, store, ns: "repo:x", out };
}

const exhausted = {
	outcome: "blocked" as const,
	retries: 2,
	verified: ["npm run lint"],
	attempts: [
		{ retry: 0, cmd: "npm test", exitCode: 1, tail: "boom", skipped: false },
		{ retry: 1, cmd: "npm test", exitCode: 1, tail: "boom", skipped: false },
	],
};

/** What the entry must say: the "why" derived from the attempts, entry-first. */
const exhaustedEntry = { kind: "gate", ...exhausted, reasons: ["verify failed: npm test exited 1"] };

function lastGate() {
	for (const e of SessionStore.read(sess.path).reverse())
		if (e.type === "decision" && e.decision.kind === "gate") return e.decision;
	return undefined;
}

it("exhausted block: entry plus outcome, verified_by and ONE deduplicated failed_because", async () => {
	const cap = capture();
	const { store, captured } = capturing();
	await recordGate(agent(), opts(store, cap.out), "r1", exhausted);
	expect(lastGate()).toEqual(exhaustedEntry);
	expect(captured.map((f) => [f.predicate, f.object])).toEqual([
		["outcome", "blocked"],
		["verified_by", "npm run lint"],
		["failed_because", "verify failed: npm test exited 1"],
	]);
	expect(captured.every((f) => f.subject === "Run:r1")).toBe(true);
	expect(cap.text()).not.toContain("warning");
});

it("claim-check BLOCK: one failed_because per reason, nothing claimCheck already owns", async () => {
	const cap = capture();
	const { store, captured } = capturing();
	const reasons = ["the report claims verification passed, but no verify command did"];
	await recordGate(agent(), opts(store, cap.out), "r1", {
		outcome: "blocked",
		retries: 0,
		verified: [],
		reportCheck: "BLOCK",
		reasons,
	});
	expect(captured.map((f) => [f.predicate, f.object])).toEqual([["failed_because", reasons[0]]]);
});

it("claim-check ALLOW: entry written, zero facts", async () => {
	const cap = capture();
	const { store, captured } = capturing();
	await recordGate(agent(), opts(store, cap.out), "r1", {
		outcome: "completed",
		retries: 0,
		verified: ["npm test"],
		reportCheck: "ALLOW",
	});
	expect(lastGate()?.outcome).toBe("completed");
	expect(captured).toEqual([]);
});

it("no store (memory disabled): entry written silently, no throw", async () => {
	const cap = capture();
	await recordGate(agent(), opts(null, cap.out), "r1", exhausted);
	expect(lastGate()).toEqual(exhaustedEntry);
	expect(cap.text()).not.toContain("warning");
});

it("refusing store: entry still written, warning printed, outcome untouched", async () => {
	const cap = capture();
	await recordGate(agent(), opts(refusing, cap.out), "r1", exhausted);
	expect(lastGate()).toEqual(exhaustedEntry);
	expect(cap.text()).toContain("warning: gate evidence was not recorded");
});
