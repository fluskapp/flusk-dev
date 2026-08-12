/**
 * `flusk workspace` — the user-owned prompt layer: scaffold it, inspect it, find
 * it. It parses its own argv rather than going through main.ts's parseArgs,
 * because `--project` is a boolean here and a string (`--project <name>`) for
 * `flusk search` / `flusk find`, and one option table cannot be both.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	globalWorkspaceDir,
	loadWorkspace,
	projectWorkspaceDir,
	workspacePaths,
} from "../agent/workspace.js";
import { SCAFFOLD } from "./workspace-scaffold.js";

const WORKSPACE_USAGE = `Usage:
  flusk workspace init [--project]   scaffold IDENTITY.md, SOUL.md, TOOLS.md
  flusk workspace show [--project]   what is loaded, from where, and what is absent
  flusk workspace path               print the global workspace directory
`;

/** Writes only what is absent: an edited file is never overwritten. */
function initWorkspace(dir: string, out: NodeJS.WritableStream): number {
	mkdirSync(dir, { recursive: true });
	for (const [name, body] of SCAFFOLD) {
		const path = join(dir, name);
		try {
			writeFileSync(path, body, { flag: "wx" }); // wx: fails if it exists
			out.write(`wrote ${path}\n`);
		} catch (e) {
			const err = e as NodeJS.ErrnoException;
			if (err.code !== "EEXIST") throw e;
			out.write(`kept  ${path} (already exists)\n`);
		}
	}
	out.write(`\nEdit these, then \`flusk run …\` — they are injected into every prompt.\n`);
	return 0;
}

function showWorkspace(repoRoot: string, projectOnly: boolean, out: NodeJS.WritableStream): number {
	const ws = loadWorkspace(repoRoot);
	const loaded = new Set(ws.layers.map((l) => l.source));
	out.write(`workspace for ${repoRoot}\n\n`);
	if (ws.layers.length === 0) out.write("loaded: nothing — the built-in prompt is unchanged\n");
	for (const l of ws.layers) {
		const cut = l.truncated ? ", truncated" : "";
		out.write(`loaded  ${l.kind.padEnd(8)} ${l.source} (${l.text.length} chars${cut})\n`);
	}
	out.write("\n");
	for (const path of workspacePaths(repoRoot, projectOnly)) {
		if (!loaded.has(path)) out.write(`absent  ${path} — create it and it is loaded from there\n`);
	}
	for (const note of ws.notes) out.write(`note    ${note}\n`);
	return 0;
}

export function workspaceCmd(
	argv: string[],
	out: NodeJS.WritableStream = process.stdout,
	repoRoot: string = process.cwd(),
): number {
	const projectOnly = argv.includes("--project");
	const sub = argv.find((a) => !a.startsWith("-"));
	if (sub === "path") {
		out.write(`${globalWorkspaceDir()}\n`);
		return 0;
	}
	if (sub === "init") {
		return initWorkspace(projectOnly ? projectWorkspaceDir(repoRoot) : globalWorkspaceDir(), out);
	}
	if (sub === "show") return showWorkspace(repoRoot, projectOnly, out);
	process.stderr.write(WORKSPACE_USAGE);
	return 1;
}
