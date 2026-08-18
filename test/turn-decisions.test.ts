/**
 * Per-turn decision entries: the recorder correlates with the checkpoint
 * subscriber's committed set, and both new Decision arms (turn, gate) render
 * in the explain ladder without ever hitting the context fallthrough.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { renderDecisionLog } from "../src/cli/explain-render.js";
import { recordTurnDecisions } from "../src/features/run/decision-recorders.js";
import type { DecisionLog } from "../src/features/run/decisions.js";
import type { AssistantMsg, StopReason } from "../src/features/run/run.types.js";
import { SessionStore } from "../src/features/session/session.repository.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { createEventBus } from "../src/platform/events/events.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-turn-decisions-");
});
afterEach(() => teardownTestHome());

const asst = (costUsd: number, stopReason: StopReason): AssistantMsg => ({
	role: "assistant",
	content: [],
	stopReason,
	usage: { input: 0, output: 0, cacheRead: 0, costUsd },
});

it("records one turn entry per turn:end, checkpointed only when the set says so", async () => {
	const session = Session.create({ task: "t", repoRoot: repo, model: fakeModel });
	const bus = createEventBus();
	const committed = new Set<number>([2]);
	recordTurnDecisions(bus, session, committed);
	await bus.emit({
		type: "turn:end",
		turn: 1,
		message: asst(0.01, "toolUse"),
		toolResults: [{ role: "toolResult", callId: "c1", name: "write", output: "", isError: false }],
	});
	await bus.emit({ type: "turn:end", turn: 2, message: asst(0.02, "end"), toolResults: [] });
	session.close();

	const turns = SessionStore.read(session.path)
		.filter((e) => e.type === "decision")
		.map((e) => e.decision)
		.filter((d) => d.kind === "turn");
	expect(turns).toHaveLength(2);
	const [t1, t2] = turns;
	if (t1?.kind !== "turn" || t2?.kind !== "turn") throw new Error("no turn decision");
	expect(t1).toEqual({ kind: "turn", turn: 1, tools: ["write"], costUsd: 0.01, stop: "toolUse" });
	expect("checkpointed" in t1).toBe(false);
	expect(t2).toEqual({
		kind: "turn",
		turn: 2,
		tools: [],
		costUsd: 0.02,
		stop: "end",
		checkpointed: true,
	});
});

const logOf = (decisions: DecisionLog["decisions"]): DecisionLog => ({
	runId: "r1",
	task: "t",
	createdAt: "2026-08-17T00:00:00.000Z",
	decisions,
	gate: null,
});

it("renders turn and gate arms without hitting the context fallthrough", () => {
	const prose = renderDecisionLog(
		logOf([
			{
				at: "2026-08-17T00:00:01.000Z",
				decision: {
					kind: "turn",
					turn: 1,
					tools: ["write", "bash"],
					costUsd: 0.0123,
					stop: "toolUse",
					checkpointed: true,
				},
			},
			{
				at: "2026-08-17T00:00:02.000Z",
				decision: {
					kind: "gate",
					outcome: "blocked",
					retries: 2,
					verified: ["npm test"],
					attempts: [{ retry: 1, cmd: "npm test", exitCode: 1, tail: "FAIL x", skipped: false }],
					reportCheck: "BLOCK",
					reasons: ["report claims green"],
				},
			},
		]),
	);
	expect(prose).toContain("turn       1");
	expect(prose).toContain("checkpointed");
	expect(prose).toContain("gate       blocked");
	expect(prose).toContain("2 retries");
	expect(prose).toContain("report BLOCK");
	expect(prose).toContain("verified npm test");
	expect(prose).toContain("because report claims green");
	expect(prose).toContain("retry 1: npm test exited 1");
	expect(prose).toContain("FAIL x");
	expect(prose).not.toContain("context    ");
});

it("a clean gate renders zero-retry prose and its report verdict", () => {
	const prose = renderDecisionLog(
		logOf([
			{
				at: "2026-08-17T00:00:01.000Z",
				decision: {
					kind: "gate",
					outcome: "completed",
					retries: 0,
					verified: [],
					reportCheck: "ALLOW",
				},
			},
		]),
	);
	expect(prose).toContain("gate       completed");
	expect(prose).toContain("clean first pass");
	expect(prose).toContain("report ALLOW");
});
