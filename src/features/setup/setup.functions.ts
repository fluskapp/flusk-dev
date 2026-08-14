/**
 * The setup feature's server surface: the LAST recorded doctor verdicts,
 * read from facts — never a live probe. The overview loader calls this on
 * every paint, and a probe that shells out to docker (15s timeout when the
 * daemon is down) has no business on that path; `flusk doctor` and the
 * nightly maintain are what refresh the record.
 */
import { createServerFn } from "@tanstack/react-start";
import { createFactStore } from "../facts/facts.repository.js";
import { FLUSK_NS } from "../facts/namespaces.js";
import { loadConfig } from "../../platform/config/config.js";

export interface SetupStatus {
	/** "ok: v24…" strings keyed by check name; empty when never recorded. */
	checks: Record<string, string>;
	worst: "ok" | "warn" | "fail" | "unknown";
}

export const getSetupStatus = createServerFn().handler(async (): Promise<SetupStatus> => {
	if (!loadConfig(process.cwd()).memory.enabled) return { checks: {}, worst: "unknown" };
	try {
		const rows = await createFactStore().query(FLUSK_NS, { predicate: "status" });
		const checks: Record<string, string> = {};
		for (const f of rows) {
			if (f.subject.startsWith("Setup:")) checks[f.subject.slice("Setup:".length)] = f.object;
		}
		const worst = ["fail", "warn"].find((w) =>
			Object.values(checks).some((v) => v.startsWith(`${w}:`)),
		) as "fail" | "warn" | undefined;
		return {
			checks,
			worst: Object.keys(checks).length === 0 ? "unknown" : (worst ?? "ok"),
		};
	} catch {
		return { checks: {}, worst: "unknown" };
	}
});
