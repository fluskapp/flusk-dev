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
	if (override === undefined) return chooseModel(cfg, kind, await loadScores()).ref;
	const slash = override.indexOf("/");
	if (slash <= 0 || slash === override.length - 1) {
		throw new Error(`--model must look like "provider/id", got "${override}"`);
	}
	return resolveModelRef({ provider: override.slice(0, slash), id: override.slice(slash + 1) });
}
