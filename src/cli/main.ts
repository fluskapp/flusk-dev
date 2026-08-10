#!/usr/bin/env node
import { parseArgs } from "node:util";
import { feedbackCmd } from "./feedback-cmd.js";
import { goalCmd } from "./goal-cmd.js";
import { resumeCmd } from "./resume-cmd.js";
import { parseRunArgs } from "./run-args.js";
import { runCmd } from "./run-cmd.js";
import { runsCmd } from "./runs-cmd.js";
import { uiCmd } from "./ui-cmd.js";
import { watchCmd } from "./watch-cmd.js";

const USAGE = `Usage:
  ah run <task> [--model <provider/id>] [--kind <plan|code|review|summarize>]
                 [--max-cost <usd>] [--for <2h|30m>] [--max-turns <n>] [--repo <path>]
                 [--dry] [--no-isolation] [--allow-dirty] [--no-verify] [--quiet]
                 [--fake <script.json>]
  ah resume <path-or-id> [--steer <msg>] [--fake <script.json>] [--no-verify] [--quiet]
  ah goal <text> [--repo <path>] [--dry] [--fake <script.json>] [--no-verify] [--quiet]
  ah goal --list [--repo <path>]
  ah feedback <good|bad>
  ah runs [-n <count>]
  ah watch [--repo <path>] [--once]
  ah ui [--port <n>] [--no-open]
`;

function fail(message: string): void {
	process.stderr.write(message);
	process.exitCode = 1;
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
				"no-verify": { type: "boolean" },
				list: { type: "boolean" },
				quiet: { type: "boolean" },
				steer: { type: "string" },
				n: { type: "string", short: "n" },
				port: { type: "string" },
				"no-open": { type: "boolean" },
				once: { type: "boolean" },
			},
		});
	} catch (e) {
		fail(`ah: ${e instanceof Error ? e.message : String(e)}\n${USAGE}`);
		return;
	}
	const { values: v, positionals } = parsed;
	const [command, arg] = positionals;

	if (command === "ui") {
		const port = v.port === undefined ? 4877 : Number(v.port);
		if (!Number.isInteger(port) || port < 0 || port > 65535) {
			return fail("ah: --port must be a valid port number\n");
		}
		await uiCmd({ port, open: v["no-open"] !== true });
		return;
	}
	if (command === "watch") {
		process.exitCode = await watchCmd({
			repo: typeof v.repo === "string" ? v.repo : process.cwd(),
			once: v.once === true,
		});
		return;
	}
	if (command === "runs") {
		const limit = v.n === undefined ? 20 : Number(v.n);
		if (!Number.isInteger(limit) || limit <= 0) return fail("ah: -n must be a positive integer\n");
		runsCmd({ limit });
		return;
	}
	if (command === "feedback") {
		if (arg !== "good" && arg !== "bad") return fail(`ah: feedback takes "good" or "bad"\n`);
		await feedbackCmd({ good: arg === "good" });
		return;
	}
	if (command === "resume") {
		if (arg === undefined) return fail(USAGE);
		const reason = await resumeCmd({
			ref: arg,
			...(typeof v.steer === "string" ? { steer: v.steer } : {}),
			...(typeof v.fake === "string" ? { fake: v.fake } : {}),
			noVerify: v["no-verify"] === true,
			quiet: v.quiet === true,
		});
		process.exitCode = reason === "completed" ? 0 : 1;
		return;
	}
	if (command === "goal") {
		const outcome = await goalCmd({
			...(arg !== undefined ? { goal: arg } : {}),
			list: v.list === true,
			repo: typeof v.repo === "string" ? v.repo : process.cwd(),
			dry: v.dry === true,
			...(typeof v.fake === "string" ? { fake: v.fake } : {}),
			noVerify: v["no-verify"] === true,
			quiet: v.quiet === true,
		});
		process.exitCode = outcome === "completed" ? 0 : 1;
		return;
	}
	if (command !== "run" || arg === undefined) return fail(USAGE);
	const parsedRun = parseRunArgs(arg, v, process.cwd());
	if (!parsedRun.ok) return fail(parsedRun.error);
	const reason = await runCmd(parsedRun.opts);
	process.exitCode = reason === "completed" ? 0 : 1;
}

main().catch((e) => {
	fail(`ah: ${e instanceof Error ? e.message : String(e)}\n`);
});
