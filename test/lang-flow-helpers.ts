/**
 * The offline rig every end-to-end flow suite runs on: LangChain's own
 * FakeListChatModel behind the runtime's `chat` seam, one seeded history card
 * so retrieval has something to find, and a fixed price per call.
 *
 * Shared rather than copied, because two suites drifting on what "a run" means
 * is how a runtime ends up with two different definitions of a passing test.
 */
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import { buildIndex } from "../src/features/history/bm25.js";
import { fakeChatModel } from "../src/features/flows/model.js";
import type { RunFlowOpts } from "../src/features/flows/runner.js";

export const TASK = "add a retry with backoff to the uploader";

/** One card, so a composed prompt has precedent to cite. */
export const INDEX = buildIndex([
	{
		id: "commit:repo:aaaa1111",
		kind: "commit",
		project: "repo",
		ref: "aaaa1111",
		title: "retry the upload with backoff",
		text: "The uploader retries with backoff. Cap the ceiling at thirty seconds.",
		at: "2026-08-01T00:00:00.000Z",
		paths: ["src/upload/worker.ts"],
		outcome: "shipped",
	},
]);

export const CFG = { ...DEFAULT_CONFIG, verify: { retries: 1, evidenceLines: 5 } };

/** A scripted model, plus every prompt it was handed. `throwOn` fakes a crash. */
export async function scripted(
	responses: string[],
	throwOn = -1,
): Promise<{ chat: RunFlowOpts["chat"]; prompts: string[] }> {
	const prompts: string[] = [];
	const fake = await fakeChatModel(responses);
	const chat: RunFlowOpts["chat"] = async () => ({
		reason: "",
		model: {
			invoke: async (text: string) => {
				if (prompts.length === throwOn) throw new Error("the model fell over");
				prompts.push(text);
				return fake?.invoke(text) ?? { content: "" };
			},
		},
	});
	return { chat, prompts };
}

/** Run options with a FIXED price per call, so cap assertions are arithmetic. */
export const flowOpts = (repo: string, over: Partial<RunFlowOpts>): RunFlowOpts => ({
	repoRoot: repo,
	index: INDEX,
	store: null,
	costOf: () => 0.25,
	...over,
});
