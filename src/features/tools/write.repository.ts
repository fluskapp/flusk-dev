import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Type } from "typebox";
import type { Tool } from "./tool.js";

const params = Type.Object({
	file_path: Type.String(),
	content: Type.String(),
});

export const writeTool: Tool<typeof params> = {
	name: "write",
	description:
		"Write a file to the filesystem, creating parent directories as needed. " +
		"Overwrites the file if it already exists.",
	parameters: params,
	mode: "sequential",
	async execute(args, ctx) {
		const path = resolve(ctx.cwd, args.file_path);
		const decision = ctx.policy.decide({ kind: "fileWrite", path });
		if (!decision.allow) throw new Error(decision.reason);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, args.content, "utf8");
		const bytes = Buffer.byteLength(args.content, "utf8");
		return { output: `Wrote ${bytes} bytes to ${path}`, details: { bytes } };
	},
};
