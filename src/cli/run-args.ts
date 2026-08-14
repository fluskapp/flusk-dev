/**
 * Flag validation for `flusk run`, kept out of main.ts so the dispatcher stays
 * a readable table of commands. Returns either the options runCmd wants or a
 * message to print.
 */
import type { TaskKind } from "../platform/config/types.js";
import type { RunCmdOpts } from "./run-cmd.js";

const KINDS: ReadonlySet<string> = new Set(["plan", "code", "review", "summarize"]);

export type ParsedRunArgs = { ok: true; opts: RunCmdOpts } | { ok: false; error: string };

/** "2h", "30m", "45s", "1h30m" → milliseconds; null when unparseable. */
function parseDuration(text: string): number | null {
	const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
	if (!m || m[0] === "") return null;
	return (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) * 1000;
}

/** parseArgs values: a repeated flag arrives as an array, hence the union. */
type Values = Record<string, string | boolean | (string | boolean)[] | undefined>;

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function parseRunArgs(task: string, v: Values, cwd: string): ParsedRunArgs {
	const maxTurns = v["max-turns"] === undefined ? undefined : Number(v["max-turns"]);
	if (maxTurns !== undefined && (!Number.isInteger(maxTurns) || maxTurns <= 0)) {
		return { ok: false, error: "flusk: --max-turns must be a positive integer\n" };
	}
	const maxCost = v["max-cost"] === undefined ? undefined : Number(v["max-cost"]);
	if (maxCost !== undefined && !(maxCost > 0)) {
		return { ok: false, error: "flusk: --max-cost must be a positive number of dollars\n" };
	}
	const forFlag = str(v.for);
	const deadlineMs = forFlag !== undefined ? parseDuration(forFlag) : undefined;
	if (deadlineMs === null) {
		return { ok: false, error: "flusk: --for must look like 2h, 30m, 45s or 1h30m\n" };
	}
	const kind = str(v.kind);
	if (kind !== undefined && !KINDS.has(kind)) {
		return { ok: false, error: "flusk: --kind must be plan, code, review or summarize\n" };
	}
	const fake = str(v.fake);
	const model = str(v.model);
	return {
		ok: true,
		opts: {
			task,
			repo: str(v.repo) ?? cwd,
			...(fake !== undefined ? { fake } : { real: true }),
			...(model !== undefined ? { model } : {}),
			...(kind !== undefined ? { kind: kind as TaskKind } : {}),
			...(maxCost !== undefined ? { maxCostUsd: maxCost } : {}),
			...(deadlineMs !== undefined ? { deadlineMs } : {}),
			...(maxTurns !== undefined ? { maxTurns } : {}),
			...(v.container === true ? { container: true } : {}),
			dry: v.dry === true,
			noIsolation: v["no-isolation"] === true,
			allowDirty: v["allow-dirty"] === true,
			noVerify: v["no-verify"] === true,
			noExtensions: v["no-extensions"] === true,
			quiet: v.quiet === true,
		},
	};
}
