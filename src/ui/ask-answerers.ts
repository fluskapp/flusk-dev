/**
 * Who can answer an Ask-AI question: the agent registry AND the raw chat
 * backends, in one list, because the user is choosing WHO answers rather than
 * which subsystem it came from.
 *
 * An agent contributes a PROMPT and a backend to run it on — never a binary
 * and never a key, since `config.chat.backends` is refused from the project
 * layer (src/config/config.ts) and `specAvailability` resolves `backendId`
 * against the list passed in here. A cloned repo can therefore add a persona
 * to this picker and nothing else.
 *
 * `worker: "internal"` names no backend by design (it means "the parent run's
 * provider"), and this panel is not a run — so it is resolved onto the first
 * AVAILABLE backend and the row says which one, rather than being hidden or
 * silently answered by a model the user did not choose.
 *
 * Nothing here throws or drops a row: an unavailable answerer is listed with
 * the reason, the same rule src/chat/detect.ts keeps for backends.
 */
import { listBackends } from "../chat/detect.js";
import type { ChatBackend } from "../chat/types.js";
import type { FluskConfig } from "../config/types.js";
import { loadAgentRegistry } from "../orchestra/registry.js";
import type { AgentSpec } from "../orchestra/types.js";
import type { Answerer } from "./ask-types.js";

export interface AnswererList {
	list: Answerer[];
	/** answerer id → the agent's own prompt; empty for a raw backend. */
	preambles: Map<string, string>;
}

export async function askAnswerers(cfg: FluskConfig, repoRoot: string): Promise<AnswererList> {
	const backends = listBackends(cfg);
	const fallback = backends.find((b) => b.available) ?? null;
	const registry = await loadAgentRegistry({ repoRoot, backends });
	const out: AnswererList = { list: [], preambles: new Map() };
	for (const spec of registry.list()) {
		const row = agentRow(spec, registry.available(spec), backends, fallback);
		out.list.push(row);
		out.preambles.set(row.id, spec.prompt);
	}
	for (const backend of backends) out.list.push(backendRow(backend));
	return out;
}

function agentRow(
	spec: AgentSpec,
	avail: { ok: boolean; reason?: string },
	backends: readonly ChatBackend[],
	fallback: ChatBackend | null,
): Answerer {
	const row: Answerer = {
		id: `agent:${spec.name}`,
		label: spec.name,
		kind: "agent",
		backendId: null,
		scope: spec.scope,
		description: spec.description,
		// Carried on the row, not only in `preambles`: the panel has to be able to
		// show what a project-scoped repo will prepend to the user's question
		// before the question is sent, not after.
		preamble: spec.prompt,
		available: false,
	};
	if (spec.worker === "internal") {
		// "the parent run's provider" has no meaning in a panel, so the panel's
		// own default stands in — named, so the answer never hides its model.
		if (fallback === null) return { ...row, note: "no chat backend is available" };
		return { ...row, backendId: fallback.id, via: fallback.label, available: true };
	}
	if (!avail.ok) return { ...row, note: avail.reason ?? "unavailable" };
	const backend = backends.find((b) => b.id === spec.backendId);
	return {
		...row,
		backendId: spec.backendId ?? null,
		...(backend === undefined ? {} : { via: backend.label }),
		available: true,
	};
}

function backendRow(backend: ChatBackend): Answerer {
	return {
		id: `backend:${backend.id}`,
		label: backend.label,
		kind: "backend",
		backendId: backend.id,
		via: backend.label,
		available: backend.available,
		...(backend.note === undefined ? {} : { note: backend.note }),
	};
}
