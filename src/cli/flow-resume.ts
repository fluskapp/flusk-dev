/**
 * `ah flow resume <id>` — what a run id still knows about itself.
 *
 * The checkpoint's header line is the only record of which flow a run used and
 * what it was asked to do, so a resume reads its spec and its task from there
 * rather than making the user retype either.
 */
import { readCheckpoint } from "../lang/checkpoint-read.js";
import { flowByName } from "../lang/library.js";
import type { FlowSpec } from "../lang/types.js";

/** The run this id checkpointed: its flow and the task it was given. */
export async function resumed(
	runId: string,
	flows: FlowSpec[],
): Promise<{ spec: FlowSpec; task: string }> {
	const head = (await readCheckpoint(runId)).find((l) => l.type === "run");
	if (head === undefined || head.type !== "run") {
		throw new Error(`no checkpoint for run "${runId}"`);
	}
	const spec = flowByName(head.spec, flows);
	if (spec === null)
		throw new Error(`run "${runId}" used flow "${head.spec}", which no longer exists`);
	return { spec, task: head.task };
}
