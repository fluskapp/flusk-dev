/**
 * From `AgentSpec.backendId` to something a worker can actually spawn or POST
 * to.
 *
 * The verdict ("may this spec run?") is NOT decided here: availability.ts
 * owns it, and every Worker.available() goes through the same function so the
 * three workers cannot drift into three different reasons. This file only
 * adds what running needs and probing does not — the resolved command, argv
 * and endpoint from `config.chat.backends`.
 *
 * That split is also the trust boundary. A spec contributes TEXT and a
 * backend NAME; the binary, argv, base URL and API key env var come only from
 * config, which src/config/config.ts refuses from a repo's own .flusk/config.json. An
 * id that does not resolve makes the spec unavailable with a reason — it
 * never falls back to another backend, because silently running a task on a
 * model the user did not choose is the exact surprise the contract forbids.
 */
import { type ResolvedBackend, resolveBackends } from "../chat/detect.repository.js";
import type { ChatBackendKind } from "../chat/types.js";
import type { FluskConfig } from "../../platform/config/types.js";
import { specAvailability } from "./availability.js";
import type { AgentSpec } from "./types.js";

export type BackendLookup = { ok: true; backend: ResolvedBackend } | { ok: false; reason: string };

export function specBackend(cfg: FluskConfig, spec: AgentSpec, want: ChatBackendKind): BackendLookup {
	const resolved = resolveBackends(cfg);
	const verdict = specAvailability(
		spec,
		resolved.map((r) => r.backend),
	);
	if (!verdict.ok) return { ok: false, reason: verdict.reason ?? "unavailable" };
	const found = resolved.find((r) => r.backend.id === spec.backendId);
	// specAvailability has already proven the id resolves to an available
	// backend of this worker's kind; both guards are the "cannot happen" path.
	if (found === undefined) return { ok: false, reason: `unknown backend "${spec.backendId}"` };
	if (found.config.kind !== want) {
		return { ok: false, reason: `backend "${found.backend.id}" is not ${want}` };
	}
	return { ok: true, backend: found };
}
