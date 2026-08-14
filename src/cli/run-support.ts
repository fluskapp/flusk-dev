/**
 * Shared run plumbing for the run/resume/goal commands: model selection, and
 * re-exports of the toolbelt and fake scripts that now live with their
 * features (tools/toolbelt.ts, provider/fake-script.repository.ts).
 */
import type { FluskConfig, TaskKind } from "../platform/config/types.js";
import type { ModelRef } from "../features/run/run.types.js";
import { resolveModelRef } from "../features/provider/pi-ai.js";
import { chooseModel } from "../features/provider/router.js";
import { loadScores } from "../features/provider/scores.repository.js";

export { demoScript, loadFakeScript } from "../features/provider/fake-script.repository.js";
export { DEFAULT_TOOLS } from "../features/tools/toolbelt.js";

export const fakeModel: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200_000 };

/** Conventional API-key env var for a provider (anthropic → ANTHROPIC_API_KEY). */
export const envKeyVar = (provider: string): string =>
	`${provider.toUpperCase().replace(/-/g, "_")}_API_KEY`;



export async function pickModel(cfg: FluskConfig, kind: TaskKind, override?: string): Promise<ModelRef> {
	return (await pickModelWhy(cfg, kind, override)).ref;
}

/** The choice AND its provenance — what `flusk explain` reports later. */
export async function pickModelWhy(
	cfg: FluskConfig,
	kind: TaskKind,
	override?: string,
): Promise<{ ref: ModelRef; source: "scores" | "config" | "override" }> {
	if (override === undefined) {
		const scores = await loadScores();
		const picked = chooseModel(cfg, kind, scores);
		const configured = cfg.models[kind];
		// When the measured winner IS the configured model, "config" is reported:
		// not strictly the router's reasoning, but the truthful substance — the
		// configured model ran, and scores did not change the outcome.
		const fromScores =
			scores !== undefined &&
			(picked.choice.provider !== configured.provider || picked.choice.id !== configured.id);
		return { ref: picked.ref, source: fromScores ? "scores" : "config" };
	}
	const slash = override.indexOf("/");
	if (slash <= 0 || slash === override.length - 1) {
		throw new Error(`--model must look like "provider/id", got "${override}"`);
	}
	return {
		ref: resolveModelRef({ provider: override.slice(0, slash), id: override.slice(slash + 1) }),
		source: "override",
	};
}
