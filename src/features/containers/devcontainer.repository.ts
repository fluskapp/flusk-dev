/**
 * devcontainer.json discovery: the repo's own statement of what it runs in.
 * Image-based files are honored; a Dockerfile/compose build is reported as
 * unsupported rather than half-built — an image the harness did not build is
 * an image a reviewer can name.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DevcontainerSpec } from "./container.types.js";

const CANDIDATES = [".devcontainer/devcontainer.json", ".devcontainer.json"];

/** Strips // and /* comments — devcontainer.json is JSONC in the wild. */
function stripComments(raw: string): string {
	return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

export function readDevcontainer(repoRoot: string): DevcontainerSpec | null {
	for (const rel of CANDIDATES) {
		let raw: string;
		try {
			raw = readFileSync(join(repoRoot, rel), "utf8");
		} catch {
			continue;
		}
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(stripComments(raw)) as Record<string, unknown>;
		} catch (e) {
			return { unsupported: `${rel} is not parseable JSON(C): ${e instanceof Error ? e.message : e}` };
		}
		if (typeof parsed.image === "string") {
			return {
				image: parsed.image,
				...(typeof parsed.workspaceFolder === "string"
					? { workspaceFolder: parsed.workspaceFolder }
					: {}),
			};
		}
		if (parsed.build !== undefined || parsed.dockerComposeFile !== undefined) {
			return { unsupported: `${rel} uses a Dockerfile/compose build; only "image" is supported` };
		}
		return { unsupported: `${rel} names no image` };
	}
	return null;
}
