#!/usr/bin/env node
import { parseArgs } from "node:util";
import { describeMigration, migrateHome } from "../platform/paths/migrate.js";
import { CLI_OPTIONS } from "./cli-options.js";
import { feedbackCmd } from "./feedback-cmd.js";
import { parseFlowArgs } from "./flow-args.js";
import { flowCmd } from "./flow-cmd.js";
import { goalCmd } from "./goal-cmd.js";
import { resumeCmd } from "./resume-cmd.js";
import { parseRunArgs } from "./run-args.js";
import { runCmd } from "./run-cmd.js";
import { uiCmd } from "./ui-cmd.js";
import { queryCommand } from "./query-commands.js";
import { USAGE } from "./usage.js";
import { watchCmd } from "./watch-cmd.js";
import { workspaceCmd } from "./workspace-cmd.js";

function fail(message: string): void {
	process.stderr.write(message);
	process.exitCode = 1;
}

async function main(): Promise<void> {
	// Before anything reads state: `~/.ah` becomes `~/.flusk` exactly once, and
	// says so, because a state root that moved without a word is indistinguishable
	// from a state root that was lost.
	for (const line of describeMigration(migrateHome())) process.stderr.write(`flusk: ${line}\n`);
	if (process.argv[2] === "workspace") {
		process.exitCode = workspaceCmd(process.argv.slice(3));
		return;
	}
	let parsed: ReturnType<typeof parseArgs>;
	try {
		parsed = parseArgs({
			args: process.argv.slice(2),
			allowPositionals: true,
			options: CLI_OPTIONS,
		});
	} catch (e) {
		fail(`flusk: ${e instanceof Error ? e.message : String(e)}\n${USAGE}`);
		return;
	}
	const { values: v, positionals } = parsed;
	const [command, arg] = positionals;

	if (command === "ui") {
		const port = v.port === undefined ? 4877 : Number(v.port);
		if (!Number.isInteger(port) || port < 0 || port > 65535) {
			return fail("flusk: --port must be a valid port number\n");
		}
		await uiCmd({ port, open: v["no-open"] !== true, server: v.server === true });
		return;
	}
	if (command === "watch") {
		process.exitCode = await watchCmd({
			repo: typeof v.repo === "string" ? v.repo : process.cwd(),
			once: v.once === true,
		});
		return;
	}
	if (await queryCommand(command, arg, v)) return;
	if (command === "feedback") {
		if (arg !== "good" && arg !== "bad") return fail(`flusk: feedback takes "good" or "bad"\n`);
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
			noExtensions: v["no-extensions"] === true,
			quiet: v.quiet === true,
		});
		process.exitCode = reason === "completed" ? 0 : 1;
		return;
	}
	if (command === "flow") {
		const parsedFlow = parseFlowArgs(positionals.slice(1), v, process.cwd());
		if (!parsedFlow.ok) return fail(parsedFlow.error);
		process.exitCode = (await flowCmd(parsedFlow.opts)) === "completed" ? 0 : 1;
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
			noExtensions: v["no-extensions"] === true,
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
	fail(`flusk: ${e instanceof Error ? e.message : String(e)}\n`);
});
