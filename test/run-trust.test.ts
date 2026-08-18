/**
 * The trust-signal synthesis, as pure units: the gate's decision entry beats
 * the facts ledger (D4 — the session file is the primary store), the LAST
 * entry wins (the retry that finally passed), absences stay honest via
 * gateSource, and gateEvidence folds failed_because rows into reasons.
 */
import { expect, it } from "vitest";
import { gateEvidence } from "../src/features/run/decisions.js";
import { assembleRunSummary } from "../src/features/run/summary.js";
import { gateAbsence } from "../src/ui/react/runs/format.js";
import type { Fact, FactStore } from "../src/features/facts/types.js";
import type { RunEndReason } from "../src/features/run/run.types.js";
import type { Decision, SessionEntry } from "../src/features/session/entries.js";

type GateFields = Partial<Extract<Decision, { kind: "gate" }>>;

function header(): SessionEntry {
	return {
		type: "header", version: 1, id: "r1", task: "t", repoRoot: "/repo", gitBranch: null,
		model: { provider: "fake", id: "fake-1", contextWindow: 1000 }, createdAt: "2026-01-01T00:00:00Z",
	};
}

function stats(id: number, reason: RunEndReason): SessionEntry {
	return {
		type: "stats", id, reason,
		stats: { turns: 1, usage: { input: 1, output: 1, cacheRead: 0, costUsd: 0.01 }, startedAt: "2026-01-01T00:00:00Z" },
	};
}

function gateDecision(id: number, overrides: GateFields): SessionEntry {
	return {
		type: "decision", id, at: "2026-01-01T00:00:01Z",
		decision: { kind: "gate", outcome: "completed", retries: 0, verified: [], ...overrides },
	};
}

it("gate entry beats facts: entry fields win, gateSource is entry", () => {
	const entries = [
		header(),
		gateDecision(1, {
			outcome: "blocked", retries: 2, verified: ["npm test"],
			reportCheck: "BLOCK", reasons: ["claim X unverified"],
		}),
		stats(2, "completed"),
	];
	const s = assembleRunSummary(entries, {
		verifiedBy: ["stale-cmd"], reasons: ["stale"], outcome: "completed", reportCheck: "ALLOW",
	});
	expect(s.gateSource).toBe("entry");
	expect(s.verdict).toBe("warn"); // blocked is warn, never err (D1 step 3)
	expect(s.retries).toBe(2);
	expect(s.reasons).toEqual(["claim X unverified"]);
	expect(s.verified).toEqual(["npm test"]);
});

it("the LAST gate entry wins — the retry that finally passed", () => {
	const entries = [
		header(),
		gateDecision(1, { outcome: "blocked", retries: 1, reasons: ["flaky"] }),
		gateDecision(2, { outcome: "completed", retries: 2, verified: ["npm test"] }),
		stats(3, "completed"),
	];
	const s = assembleRunSummary(entries, null);
	expect(s.verdict).toBe("ok");
	expect(s.retries).toBe(2);
	expect(s.gateSource).toBe("entry");
});

it("facts fall back for old sessions with memory on", () => {
	const entries = [header(), stats(1, "completed")];
	const s = assembleRunSummary(entries, {
		verifiedBy: ["true"], reasons: [], outcome: "completed", reportCheck: "WARN",
	});
	expect(s.gateSource).toBe("facts");
	expect(s.verdict).toBe("warn"); // a WARN report check demotes ok (D1 step 4)
	expect(s.retries).toBeNull();
});

it("memory on but nothing recorded is gateSource none, verdict from status", () => {
	const entries = [header(), stats(1, "completed")];
	const s = assembleRunSummary(entries, { verifiedBy: [], reasons: [] });
	expect(s.gateSource).toBe("none");
	expect(s.verdict).toBe("ok");
});

it("budget/maxTurns/deadline stops read as warn", () => {
	for (const reason of ["budget", "maxTurns"] as const) {
		const s = assembleRunSummary([header(), stats(1, reason)], null);
		expect(s.verdict, reason).toBe("warn");
	}
});

it("compaction entries are counted", () => {
	const compaction = (id: number): SessionEntry => ({
		type: "compaction", id, summary: "s", firstKeptEntryId: 1, tokensBefore: 100,
	});
	const s = assembleRunSummary([header(), compaction(1), compaction(2), stats(3, "completed")], null);
	expect(s.compactions).toBe(2);
});

it("gateAbsence never asserts false history: live is pending, finished is neutral", () => {
	// A running session (gateSource none, verdict live) has no past to claim.
	expect(gateAbsence("none", "live")).toBe("gate pending — run in progress");
	// Finished but never gated (--no-verify, budget stop, pre-gate session):
	// the render layer cannot tell these apart, so the absence stays neutral.
	for (const v of ["ok", "warn", "err", "none"] as const) {
		expect(gateAbsence("none", v)).toBe("no gate record for this session");
		expect(gateAbsence("none", v)).not.toMatch(/predates/);
	}
	expect(gateAbsence("memory-off", "ok")).toBe("unverified — memory disabled");
	// A recorded gate story renders the synthesis, not an absence line.
	expect(gateAbsence("entry", "warn")).toBeNull();
	expect(gateAbsence("facts", "ok")).toBeNull();
});

it("gateEvidence folds failed_because rows into reasons, deduped across runs", async () => {
	const row = (subject: string, predicate: string, object: string): Fact =>
		({ subject, predicate, object } as Fact);
	const bySubject: Record<string, Fact[]> = {
		"Run:r1": [
			row("Run:r1", "verified_by", "true"),
			row("Run:r1", "outcome", "blocked"),
			row("Run:r1", "report_check", "BLOCK"),
			row("Run:r1", "failed_because", "reason A"),
			row("Run:r1", "failed_because", "reason B"),
		],
		"Run:r2": [row("Run:r2", "failed_because", "reason A")],
	};
	const store = {
		query: async (_ns: string, q: { subject?: string }) => bySubject[q.subject ?? ""] ?? [],
	} as unknown as FactStore;
	const g = await gateEvidence(store, "ns", ["r1", "r2"]);
	expect(g.reasons).toEqual(["reason A", "reason B"]);
	expect(g.verifiedBy).toEqual(["true"]);
	expect(g.outcome).toBe("blocked");
	expect(g.reportCheck).toBe("BLOCK");
});
