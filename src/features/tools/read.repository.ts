import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { Type } from "typebox";
import type { Tool } from "./tool.js";

const params = Type.Object({
	file_path: Type.String(),
	offset: Type.Optional(Type.Number()),
	limit: Type.Optional(Type.Number()),
});

const DEFAULT_LIMIT = 2000;

export const readTool: Tool<typeof params> = {
	name: "read",
	description:
		"Read a file from the filesystem. Output is numbered cat -n style. " +
		"Optional offset (1-based first line) and limit (max lines, default 2000).",
	parameters: params,
	mode: "parallel",
	async execute(args, ctx) {
		const path = resolve(ctx.cwd, args.file_path);
		let info: Awaited<ReturnType<typeof stat>>;
		try {
			info = await stat(path);
		} catch {
			throw new Error(`File not found: ${path}`);
		}
		if (info.isDirectory()) {
			throw new Error(`Path is a directory, not a file: ${path}`);
		}
		const text = await readFile(path, "utf8");
		const lines = text.split("\n");
		if (lines.at(-1) === "" && text.endsWith("\n")) lines.pop();

		const offset = Math.max(1, Math.floor(args.offset ?? 1));
		const limit = Math.max(1, Math.floor(args.limit ?? DEFAULT_LIMIT));
		const slice = lines.slice(offset - 1, offset - 1 + limit);
		if (slice.length === 0 && lines.length > 0) {
			return {
				output: `offset ${offset} is beyond end of file (${lines.length} lines)`,
				details: { totalLines: lines.length, truncated: false },
			};
		}
		const numbered = slice
			.map((line, i) => `${String(offset + i).padStart(6)}\t${line}`)
			.join("\n");

		const lastShown = offset - 1 + slice.length;
		const truncated = lastShown < lines.length;
		const note = truncated
			? `\n\n(showing lines ${offset}-${lastShown} of ${lines.length}; use offset to read more)`
			: "";
		return {
			output: numbered + note,
			details: { totalLines: lines.length, truncated },
		};
	},
};
