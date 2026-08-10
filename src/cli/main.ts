#!/usr/bin/env node
import { parseArgs } from "node:util";
import { runCmd } from "./run-cmd.js";
import { uiCmd } from "./ui-cmd.js";

const USAGE = `Usage:
  hit run <task> [--repo <path>] [--fake <script.json>] [--max-turns <n>] [--quiet]
  hit ui [--port <n>] [--no-open]
  hit resume <session>
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
				"max-turns": { type: "string" },
				quiet: { type: "boolean" },
				port: { type: "string" },
				"no-open": { type: "boolean" },
			},
		});
	} catch (e) {
		fail(`hit: ${e instanceof Error ? e.message : String(e)}\n${USAGE}`);
		return;
	}
	const { values, positionals } = parsed;
	const [command, arg] = positionals;

	if (command === "ui") {
		const port = values.port === undefined ? 4877 : Number(values.port);
		if (!Number.isInteger(port) || port < 0 || port > 65535) {
			fail("hit: --port must be a valid port number\n");
			return;
		}
		await uiCmd({ port, open: values["no-open"] !== true });
		return;
	}
	if (command === "resume") {
		fail("resume lands in Phase 2\n");
		return;
	}
	if (command !== "run" || arg === undefined) {
		fail(USAGE);
		return;
	}
	const maxTurns = values["max-turns"] === undefined ? 100 : Number(values["max-turns"]);
	if (!Number.isInteger(maxTurns) || maxTurns <= 0) {
		fail("hit: --max-turns must be a positive integer\n");
		return;
	}
	const reason = await runCmd({
		task: arg,
		repo: typeof values.repo === "string" ? values.repo : process.cwd(),
		...(typeof values.fake === "string" ? { fake: values.fake } : {}),
		maxTurns,
		quiet: values.quiet === true,
	});
	process.exitCode = reason === "completed" ? 0 : 1;
}

main().catch((e) => {
	fail(`hit: ${e instanceof Error ? e.message : String(e)}\n`);
});
