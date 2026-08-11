/**
 * The optional-runtime skip — but never a SILENT one.
 *
 * The flow runtime's only end-to-end coverage lives behind `describe.skip` when
 * LangGraph is absent, and a skipped suite reads as a green one: `8 tests | 8
 * skipped` scrolls past in a full run exactly like a pass. So absence has to be
 * declared. Set `AH_SKIP_LANG=1` to say "yes, the optional packages are gone,
 * skip those suites"; without it a checkout that cannot resolve them fails
 * loudly and names the command that fixes it.
 */
import { describe } from "vitest";
import { langMissing, loadLang } from "../src/lang/deps.js";

export const SKIP_ENV = "AH_SKIP_LANG";

/** `describe` when the runtime is installed, `describe.skip` when it is not. */
export async function withLangRuntime(): Promise<typeof describe | typeof describe.skip> {
	if ((await loadLang()) !== null) return describe;
	if (process.env[SKIP_ENV] === undefined) {
		throw new Error(
			`the flow runtime is not installed, so its suites would silently skip. ` +
				`Install it — ${langMissing()} — or set ${SKIP_ENV}=1 to skip them on purpose.`,
		);
	}
	return describe.skip;
}
