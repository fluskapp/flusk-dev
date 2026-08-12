/**
 * The commands that only READ: index, runs, search, find, prompt, context.
 *
 * Split from main.ts, which is the argument parser and the safety-relevant
 * dispatch, so that adding another way to interrogate the corpus does not keep
 * growing the one file where a mistake means running the wrong thing.
 *
 * Returns true when it handled the command, so main.ts stays a chain of
 * one-line delegations rather than two parallel lists of command names that
 * can drift.
 */
import { contextCmd } from "./context-cmd.js";
import { findCmd } from "./find-cmd.js";
import { indexCmd } from "./index-cmd.js";
import { promptCmd } from "./prompt-cmd.js";
import { runsCmd } from "./runs-cmd.js";
import { searchCmd } from "./search-cmd.js";
import { USAGE } from "./usage.js";

type Values = Record<string, unknown>;

const fail = (msg: string): boolean => {
	process.stderr.write(msg);
	process.exitCode = 2;
	return true;
};

export async function queryCommand(
	command: string | undefined,
	arg: string | undefined,
	v: Values,
): Promise<boolean> {
	if (command === "index") {
		process.exitCode = indexCmd({
			repo: typeof v.repo === "string" ? v.repo : process.cwd(),
			json: v.json === true,
		});
		return true;
	}
	if (command === "runs") {
		const limit = v.n === undefined ? 20 : Number(v.n);
		if (!Number.isInteger(limit) || limit <= 0) return fail("ah: -n must be a positive integer\n");
		runsCmd({ limit });
		return true;
	}
	if (command === "search") {
		if (arg === undefined) return fail(USAGE);
		process.exitCode = searchCmd(arg, v);
		return true;
	}
	if (command === "find") {
		if (arg === undefined) return fail(USAGE);
		process.exitCode = await findCmd(arg, v);
		return true;
	}
	if (command === "context") {
		if (arg === undefined) return fail(USAGE);
		// Scoped to the current repo like `ah run`: the context a run gets is
		// built against the repo it is about to edit, so `ah context` asked from
		// somewhere else would print a block no run would ever receive.
		process.exitCode = contextCmd(arg, {
			...v,
			repo: typeof v.repo === "string" ? v.repo : process.cwd(),
		});
		return true;
	}
	if (command === "prompt") {
		if (arg === undefined) return fail(USAGE);
		// Scoped to the current repo like `ah run`, `ah goal` and `ah watch`;
		// `--all` is how you ask for every project's history at once.
		const repo = typeof v.repo === "string" ? v.repo : process.cwd();
		process.exitCode = promptCmd(arg, { ...v, ...(v.all === true ? {} : { repo }) });
		return true;
	}
	return false;
}
