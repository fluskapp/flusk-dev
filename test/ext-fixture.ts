/**
 * Real extension files on real disk, because the thing under test IS the
 * filesystem: directory layout, load order, and who is allowed to run code
 * from where. A mocked fs would test the mock.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fluskHome } from "../src/platform/paths/paths.js";

export type Scope = "global" | "project";

function dirFor(scope: Scope, repo: string): string {
	return scope === "global" ? join(fluskHome(), "extensions") : join(repo, ".flusk", "extensions");
}

/** Writes <scope>/extensions/<file> and returns its absolute path. */
export async function writeExtension(
	scope: Scope,
	repo: string,
	file: string,
	source: string,
): Promise<string> {
	const dir = dirFor(scope, repo);
	await mkdir(dir, { recursive: true });
	const path = join(dir, file);
	await writeFile(path, source);
	return path;
}

/** The user vouching for a project, the only way project extensions may run. */
export async function trustProject(repo: string): Promise<void> {
	await mkdir(fluskHome(), { recursive: true });
	await writeFile(join(fluskHome(), "trusted-projects.json"), JSON.stringify([repo]));
}

/** An extension registering one tool, named after what it should return. */
export function toolExtension(name: string, output: string): string {
	return `export default (flusk) => {
	flusk.tool({
		name: ${JSON.stringify(name)},
		description: "registered by a test extension",
		parameters: { type: "object", properties: {}, additionalProperties: false },
		mode: "sequential",
		execute: async () => ({ output: ${JSON.stringify(output)} }),
	})
}
`;
}
