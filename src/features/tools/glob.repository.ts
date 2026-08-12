import * as fsp from "node:fs/promises";
import { basename, resolve } from "node:path";
import { Type } from "typebox";
import type { Tool } from "./tool.js";

const params = Type.Object({
	pattern: Type.String(),
	path: Type.Optional(Type.String()),
});

const MAX_RESULTS = 500;
const EXCLUDED_DIRS = new Set(["node_modules", ".git"]);

type GlobFn = (
	pattern: string,
	options: { cwd: string; exclude: (name: string) => boolean },
) => AsyncIterableIterator<string>;

function globFn(): GlobFn {
	const fn = (fsp as { glob?: GlobFn }).glob;
	if (typeof fn !== "function") {
		throw new Error("fs.promises.glob is unavailable; flusk requires Node.js >= 22");
	}
	return fn;
}

function isExcluded(entry: string): boolean {
	return entry.split("/").some((segment) => EXCLUDED_DIRS.has(segment));
}

export const globTool: Tool<typeof params> = {
	name: "glob",
	description:
		"Find files matching a glob pattern (e.g. '**/*.ts'). Optional base path " +
		"(default '.'). node_modules and .git are excluded. Results are sorted.",
	parameters: params,
	mode: "parallel",
	async execute(args, ctx) {
		const base = resolve(ctx.cwd, args.path ?? ".");
		const matches: string[] = [];
		const iterator = globFn()(args.pattern, {
			cwd: base,
			exclude: (name) => EXCLUDED_DIRS.has(basename(name)),
		});
		for await (const entry of iterator) {
			if (!isExcluded(entry)) matches.push(entry);
		}
		matches.sort();
		if (matches.length === 0) {
			return { output: "No files matched", details: { matches: 0 } };
		}
		const shown = matches.slice(0, MAX_RESULTS);
		const note =
			matches.length > shown.length
				? `\n\n(showing first ${MAX_RESULTS} of ${matches.length} matches)`
				: "";
		return {
			output: shown.join("\n") + note,
			details: { matches: matches.length, truncated: matches.length > shown.length },
		};
	},
};
