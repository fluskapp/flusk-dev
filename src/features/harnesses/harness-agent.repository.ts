/**
 * A foreign harness behind the frozen Agent seam (H0 D8) — never Provider,
 * so runWithGate drives it unchanged. Honesty contract, stated once:
 *  - No write jail: Policy/ToolContext gate only flusk's own tools; a spawned
 *    harness runs unmediated. Its only jail is cwd + argv-not-a-shell +
 *    config-only spec resolution.
 *  - No per-turn checkpoints (they need native turn:end tool results); at
 *    most a final tree diff. No git isolation: the current branch is the tree.
 *  - No cost/turn budgets: external billing is invisible until a final stats
 *    event; only limits.maxMinutes is enforced, by killing the child.
 *  - No compaction, no context block, no subagent policy.
 * The verify gate, evidence-steered retries, claim-check, session record,
 * SSE feed, abort and the Runs table all DO apply.
 */
import { randomUUID } from "node:crypto";
import type { EventBus } from "../../platform/events/events.js";
import { streamCli } from "../chat/cli-backend.repository.js";
import { snapshotTree, touchedSince, type TreeSnapshot } from "../orchestra/observe.js";
import type { Agent } from "../run/options.js";
import type { AssistantMsg, ModelRef, RunEndReason, RunStats } from "../run/run.types.js";
import { Session } from "../session/session-file.repository.js";
import type { HarnessMeta } from "./harness.types.js";
import { type Translated, translateChunks } from "./translate.js";

export interface HarnessAgentOpts {
	meta: HarnessMeta;
	task: string;
	repoRoot: string;
	events: EventBus;
	runId: string;
}

function closing(t: Translated, reason: RunEndReason): AssistantMsg {
	return {
		role: "assistant",
		content: [{ type: "text", text: t.text }],
		stopReason: reason === "completed" ? "end" : reason === "aborted" ? "aborted" : "error",
		...(t.error !== null ? { errorMessage: t.error } : {}),
		usage: { input: 0, output: 0, cacheRead: 0, costUsd: t.stats?.costUsd ?? 0 },
	};
}

export function createHarnessAgent(opts: HarnessAgentOpts): Agent {
	const { meta, repoRoot, events } = opts;
	const model: ModelRef = { provider: "external", id: meta.id, contextWindow: 0 };
	const session = Session.create({ task: opts.task, repoRoot, model, taskKind: "code", harness: meta.id });
	const queued: string[] = [];
	let turn = 0;
	let killed = false;
	let current: AbortController | null = null;

	/** File evidence via the event path collectRunRecord listens on: one
	 * synthetic edit pair per touched file; run-record.ts resolves
	 * args.file_path into filesTouched — what the gate's claim-check reads. */
	async function emitTouched(runId: string, before: TreeSnapshot): Promise<string[]> {
		const touched = touchedSince(repoRoot, before);
		let n = 0;
		for (const file of touched) {
			const callId = `${runId}-f${++n}`;
			await events.emit({ type: "tool:start", callId, name: "edit", args: { file_path: file } });
			await events.emit({ type: "tool:end", callId, name: "edit", output: "", isError: false });
		}
		return touched;
	}

	async function invoke(runId: string, prompt: string): Promise<{ reason: RunEndReason; stats: RunStats }> {
		const ac = new AbortController();
		current = ac;
		if (killed) ac.abort();
		const minutes = meta.limits?.maxMinutes;
		const timer = minutes === undefined ? null : setTimeout(() => ac.abort(), minutes * 60_000);
		const startedAt = new Date().toISOString();
		await events.emit({ type: "run:start", runId, task: opts.task, model });
		session.appendMessage({ role: "user", content: prompt });
		const before = snapshotTree(repoRoot);
		turn += 1;
		await events.emit({ type: "turn:start", turn });
		// env rides only on trusted scopes: built-ins carry none, and an
		// untrusted project spec never reaches run() (readHarness refuses it).
		const t = await translateChunks(
			streamCli(
				{
					command: meta.command,
					args: meta.args ?? [],
					prompt,
					cwd: repoRoot,
					...(meta.env !== undefined ? { env: meta.env } : {}),
				},
				ac.signal,
			),
			events,
			runId,
		);
		if (timer !== null) clearTimeout(timer);
		await emitTouched(runId, before);
		const reason: RunEndReason = ac.signal.aborted ? "aborted" : t.error !== null ? "error" : "completed";
		const message = closing(t, reason);
		session.appendMessage(message);
		session.appendDecision({ kind: "run", runId });
		session.appendDecision({ kind: "model", ref: `external/${meta.id}`, taskKind: "code", source: "config" });
		session.appendDecision({ kind: "turn", turn, tools: t.toolLabels, costUsd: t.stats?.costUsd ?? 0, stop: "end_turn" });
		await events.emit({ type: "turn:end", turn, message, toolResults: [] });
		const stats: RunStats = {
			turns: t.stats?.turns ?? 1,
			usage: { input: 0, output: 0, cacheRead: 0, costUsd: t.stats?.costUsd ?? 0 },
			startedAt,
			endedAt: new Date().toISOString(),
		};
		session.appendStats(stats, reason);
		await events.emit({ type: "run:end", reason, stats });
		return { reason, stats };
	}

	return {
		session,
		events,
		run: () => invoke(opts.runId, opts.task),
		// Fresh runId + re-emitted run:start is what resets trackAttempts
		// (gate-loop.ts); the re-prompt with evidence is the portable contract —
		// no --resume flags in v1.
		continueRun: (steer: string) => {
			const prompt = [steer, ...queued.splice(0)].filter((s) => s !== "").join("\n\n");
			return invoke(randomUUID().slice(0, 8), prompt);
		},
		// A one-shot child cannot be steered mid-flight; queuing for the next
		// continueRun is the honest v1.
		steer: (text: string) => {
			queued.push(text);
		},
		abort: () => {
			killed = true;
			current?.abort();
		},
	};
}
