/**
 * The abagraph-backed MemoryPort. Mirrors @abagraph/client's frozen-snapshot
 * agent pattern: the <memory> block is computed once per port and replayed
 * on qualifying turns (first turn / resume) — never rebuilt per turn.
 */
import type { Tool } from "../tools/tool.js";
import type { MemoryClient } from "./client-types.js";
import { buildMemoryBlock } from "./contextpack.js";
import { digestRun, type Extractor } from "./digestion.js";
import type { MemoryPort, RunRecord, TurnContext } from "./port.js";
import { memoryTools } from "./tools.js";

export interface AbagraphPortOpts {
	client: MemoryClient;
	/** Resolved repo namespace (resolveNamespace); the agent never picks one. */
	repoNs: string;
	budgets: { repo: number; lessons: number };
	/** Optional LLM lesson extractor (extraction.ts makeExtractor). */
	extractor?: Extractor;
}

export class AbagraphMemoryPort implements MemoryPort {
	/** Bound late: tools are constructed before the loop mints the run id. */
	private runId = "unknown";
	private snapshot: string | null | undefined;

	constructor(private readonly opts: AbagraphPortOpts) {}

	async preTurn(ctx: TurnContext): Promise<string | null> {
		this.runId = ctx.runId;
		if (!ctx.isFirstTurn && !ctx.isResume) return null;
		if (this.snapshot === undefined) {
			try {
				this.snapshot = await buildMemoryBlock(this.opts.client, {
					repoNs: this.opts.repoNs,
					task: ctx.task,
					goalId: ctx.goalId,
					budgets: this.opts.budgets,
				});
			} catch (e) {
				// abagraph can die between the bootstrap health check and turn 1.
				// Running without memory is a degraded run; failing the run over
				// it is a lost one. Cache the null so we warn once.
				this.snapshot = null;
				console.error(`memory: context unavailable — ${e instanceof Error ? e.message : e}`);
			}
		}
		return this.snapshot;
	}

	/** Never throws: a memory outage must not fail a completed run. */
	async postRun(run: RunRecord): Promise<void> {
		try {
			await digestRun(this.opts.client, this.opts.repoNs, run, this.opts.extractor);
		} catch (e) {
			console.error(`hit memory: digestion failed for run ${run.runId}: ${String(e)}`);
		}
	}

	tools(): Tool[] {
		return memoryTools(this.opts.client, {
			repoNs: this.opts.repoNs,
			runId: () => this.runId,
		});
	}
}
