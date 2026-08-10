#!/usr/bin/env node
import { parseArgs } from "node:util";
import type { TaskKind } from "../config/types.js";
import { feedbackCmd } from "./feedback-cmd.js";
import { resumeCmd } from "./resume-cmd.js";
import { runCmd } from "./run-cmd.js";
import { runsCmd } from "./runs-cmd.js";
import { uiCmd } from "./ui-cmd.js";

const USAGE = `Usage:
  hit run <task> [--model <provider/id>] [--kind <plan|code|review|summarize>]
                 [--max-cost <usd>] [--for <2h|30m>] [--max-turns <n>] [--repo <path>]
                 [--dry] [--no-isolation] [--allow-dirty] [--quiet] [--fake <script.json>]
  hit resume <path-or-id> [--steer <msg>] [--fake <script.json>] [--quiet]
  hit feedback <good|bad>
  hit runs [-n <count>]
  hit ui [--port <n>] [--no-open]
`;

const KINDS: ReadonlySet<string> = new Set(["plan", "code", "review", "summarize"]);

function fail(message: string): void {
	process.stderr.write(message);
	process.exitCode = 1;
}

/** "2h", "30m", "45s", "1h30m" → milliseconds; null when unparseable. */
function parseDuration(text: string): number | null {
	const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
	if (!m || m[0] === "") return null;
	return (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) * 1000;
}

async function main(): Promise<void> {
	let parsed: ReturnType<typeof parseArgs>;
	try {
		parsed = parseArgs({
			args: process.argv.slice(2),
			allowPositionals: true,
			options: {
				repo: { type: "string" },
				fake: { type: "string" },
				model: { type: "string" },
				kind: { type: "string" },
				"max-cost": { type: "string" },
				for: { type: "string" },
				"max-turns": { type: "string" },
				dry: { type: "boolean" },
				"no-isolation": { type: "boolean" },
				"allow-dirty": { type: "boolean" },
				quiet: { type: "boolean" },
				steer: { type: "string" },
				n: { type: "string", short: "n" },
				port: { type: "string" },
				"no-open": { type: "boolean" },
			},
		});
	} catch (e) {
		fail(`hit: ${e instanceof Error ? e.message : String(e)}\n${USAGE}`);
		return;
	}
	const { values: v, positionals } = parsed;
	const [command, arg] = positionals;

	if (command === "ui") {
		const port = v.port === undefined ? 4877 : Number(v.port);
		if (!Number.isInteger(port) || port < 0 || port > 65535) {
			return fail("hit: --port must be a valid port number\n");
		}
		await uiCmd({ port, open: v["no-open"] !== true });
		return;
	}
	if (command === "runs") {
		const limit = v.n === undefined ? 20 : Number(v.n);
		if (!Number.isInteger(limit) || limit <= 0) return fail("hit: -n must be a positive integer\n");
		runsCmd({ limit });
		return;
	}
	if (command === "feedback") {
		if (arg !== "good" && arg !== "bad") return fail(`hit: feedback takes "good" or "bad"\n`);
		await feedbackCmd({ good: arg === "good" });
		return;
	}
	if (command === "resume") {
		if (arg === undefined) return fail(USAGE);
		const reason = await resumeCmd({
			ref: arg,
			...(typeof v.steer === "string" ? { steer: v.steer } : {}),
			...(typeof v.fake === "string" ? { fake: v.fake } : {}),
			quiet: v.quiet === true,
		});
		process.exitCode = reason === "completed" ? 0 : 1;
		return;
	}
	if (command !== "run" || arg === undefined) return fail(USAGE);
	const maxTurns = v["max-turns"] === undefined ? undefined : Number(v["max-turns"]);
	if (maxTurns !== undefined && (!Number.isInteger(maxTurns) || maxTurns <= 0)) {
		return fail("hit: --max-turns must be a positive integer\n");
	}
	const maxCost = v["max-cost"] === undefined ? undefined : Number(v["max-cost"]);
	if (maxCost !== undefined && !(maxCost > 0)) {
		return fail("hit: --max-cost must be a positive number of dollars\n");
	}
	const deadlineMs = typeof v.for === "string" ? parseDuration(v.for) : undefined;
	if (deadlineMs === null) return fail("hit: --for must look like 2h, 30m, 45s or 1h30m\n");
	const kind = typeof v.kind === "string" ? v.kind : undefined;
	if (kind !== undefined && !KINDS.has(kind)) {
		return fail("hit: --kind must be plan, code, review or summarize\n");
	}
	const reason = await runCmd({
		task: arg,
		repo: typeof v.repo === "string" ? v.repo : process.cwd(),
		...(typeof v.fake === "string" ? { fake: v.fake } : { real: true }),
		...(typeof v.model === "string" ? { model: v.model } : {}),
		...(kind !== undefined ? { kind: kind as TaskKind } : {}),
		...(maxCost !== undefined ? { maxCostUsd: maxCost } : {}),
		...(deadlineMs !== undefined ? { deadlineMs } : {}),
		...(maxTurns !== undefined ? { maxTurns } : {}),
		dry: v.dry === true,
		noIsolation: v["no-isolation"] === true,
		allowDirty: v["allow-dirty"] === true,
		quiet: v.quiet === true,
	});
	process.exitCode = reason === "completed" ? 0 : 1;
}

main().catch((e) => {
	fail(`hit: ${e instanceof Error ? e.message : String(e)}\n`);
});
