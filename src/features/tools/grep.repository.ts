import { execFile } from "node:child_process";
import { Type } from "typebox";
import type { Tool, ToolContext } from "./tool.js";
import { truncateMiddle } from "./truncate.js";

const params = Type.Object({
	pattern: Type.String(),
	path: Type.Optional(Type.String()),
	glob: Type.Optional(Type.String()),
});

const MAX_OUTPUT_CHARS = 30_000;
const MAX_BUFFER = 16 * 1024 * 1024;

let rgAvailable: Promise<boolean> | undefined;

function probeRg(): Promise<boolean> {
	rgAvailable ??= new Promise((resolve) => {
		execFile("rg", ["--version"], (err) => resolve(err === null));
	});
	return rgAvailable;
}

interface RunOutcome {
	code: number;
	stdout: string;
	stderr: string;
}

function run(cmd: string, args: string[], ctx: ToolContext): Promise<RunOutcome> {
	return new Promise((resolve, reject) => {
		execFile(
			cmd,
			args,
			{ cwd: ctx.cwd, signal: ctx.signal, maxBuffer: MAX_BUFFER },
			(err, stdout, stderr) => {
				const code = err?.code ?? 0;
				if (typeof code !== "number") {
					reject(new Error(`failed to run ${cmd}: ${err?.message}`));
					return;
				}
				resolve({ code, stdout, stderr });
			},
		);
	});
}

export const grepTool: Tool<typeof params> = {
	name: "grep",
	description:
		"Search file contents for a regex pattern. Returns matching lines with " +
		"file names and line numbers. Optional path (default '.') and glob file filter.",
	parameters: params,
	mode: "parallel",
	async execute(args, ctx) {
		const searchPath = args.path ?? ".";
		const useRg = await probeRg();
		const [cmd, cmdArgs] = useRg
			? [
					"rg",
					[
						"--line-number",
						"--no-heading",
						"--color",
						"never",
						...(args.glob ? ["-g", args.glob] : []),
						"-e",
						args.pattern,
						"--",
						searchPath,
					],
				]
			: [
					"/usr/bin/grep",
					[
						"-rn",
						...(args.glob ? [`--include=${args.glob}`] : []),
						"-e",
						args.pattern,
						"--",
						searchPath,
					],
				];
		const { code, stdout, stderr } = await run(cmd, cmdArgs, ctx);
		if (code === 1) return { output: "No matches found", details: { matches: 0 } };
		if (code !== 0) throw new Error(`${cmd} failed (exit ${code}): ${stderr.trim()}`);
		return { output: truncateMiddle(stdout.trimEnd(), MAX_OUTPUT_CHARS) };
	},
};
