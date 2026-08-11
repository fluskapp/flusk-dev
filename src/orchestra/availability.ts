/**
 * Can this spec actually run right now — answered WITHOUT running it.
 *
 * Pure by contract: it reads an already-resolved backend list (src/chat/
 * detect.ts did the PATH lookup and the env check), spawns nothing, writes
 * nothing and makes no billable call. Every `Worker.available()` delegates
 * here so three workers cannot drift into three different answers.
 *
 * An unresolved `backendId` is reported, never defaulted. Falling back to
 * "some other configured backend" is how a spec ends up running on a model
 * the user never chose — and since `config.chat.backends` is refused from the
 * repo layer, an unresolvable id in a cloned spec is exactly the case where
 * guessing would be worst.
 */
import type { ChatBackend, ChatBackendKind } from "../chat/types.js";
import type { AgentSpec, AgentWorkerKind, WorkerAvailability } from "./types.js";

const OK: WorkerAvailability = { ok: true };

/** Which `ChatBackend.kind` each worker can drive. "internal" drives none. */
const WANTED: Record<AgentWorkerKind, ChatBackendKind | undefined> = {
	internal: undefined,
	cli: "cli",
	http: "openai-compatible",
};

export function specAvailability(
	spec: AgentSpec,
	backends: readonly ChatBackend[],
): WorkerAvailability {
	const wanted = WANTED[spec.worker];
	// "internal" runs ah's own loop on the parent run's provider: there is no
	// backend to resolve, and backendId/model were dropped at parse time.
	if (wanted === undefined) return OK;
	const id = spec.backendId ?? "";
	if (id === "") return { ok: false, reason: `worker "${spec.worker}" requires a backendId` };
	const backend = backends.find((b) => b.id === id);
	if (backend === undefined) {
		return { ok: false, reason: `backend "${id}" is not configured` };
	}
	if (backend.kind !== wanted) {
		return {
			ok: false,
			reason: `backend "${id}" is ${backend.kind}, but worker "${spec.worker}" needs ${wanted}`,
		};
	}
	if (!backend.available) {
		return { ok: false, reason: backend.note ?? `backend "${id}" is unavailable` };
	}
	return OK;
}
