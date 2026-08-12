import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Type } from "typebox";
import type { Tool } from "./tool.js";

const params = Type.Object({
	file_path: Type.String(),
	old_string: Type.String(),
	new_string: Type.String(),
	replace_all: Type.Optional(Type.Boolean()),
});

function countOccurrences(haystack: string, needle: string): number {
	let count = 0;
	let index = haystack.indexOf(needle);
	while (index !== -1) {
		count += 1;
		index = haystack.indexOf(needle, index + needle.length);
	}
	return count;
}

export const editTool: Tool<typeof params> = {
	name: "edit",
	description:
		"Replace an exact string in a file. old_string must match exactly once " +
		"unless replace_all is true, which replaces every occurrence.",
	parameters: params,
	mode: "sequential",
	async execute(args, ctx) {
		const path = resolve(ctx.cwd, args.file_path);
		const decision = ctx.policy.decide({ kind: "fileWrite", path });
		if (!decision.allow) throw new Error(decision.reason);
		if (args.old_string === args.new_string) {
			throw new Error("old_string and new_string are identical; nothing to change");
		}
		let text: string;
		try {
			text = await readFile(path, "utf8");
		} catch {
			throw new Error(`File not found: ${path}`);
		}
		const count = countOccurrences(text, args.old_string);
		if (count === 0) throw new Error(`old_string not found in ${path}`);
		if (count > 1 && !args.replace_all) {
			throw new Error(
				`old_string matches ${count} times in ${path}; ` +
					"make it unique or pass replace_all: true",
			);
		}
		const updated = args.replace_all
			? text.replaceAll(args.old_string, args.new_string)
			: text.replace(args.old_string, args.new_string);
		await writeFile(path, updated, "utf8");
		const replaced = args.replace_all ? count : 1;
		return {
			output: `Replaced ${replaced} occurrence${replaced === 1 ? "" : "s"} in ${path}`,
			details: { replaced },
		};
	},
};
