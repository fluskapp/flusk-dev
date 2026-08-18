/**
 * The one place the shipped version number comes from.
 *
 * It used to be typed into the status bar by hand, which meant the workbench
 * could claim a version the package had long since moved past. Reading
 * package.json costs one file read at startup and removes the whole class of
 * "the UI says 0.1.0" bug.
 *
 * Resolution walks UP from this module until it finds flusk's own
 * package.json: `src/platform/` sits two levels below the root, but the built
 * app bundles this file into `dist-app` chunks at other depths, so a fixed
 * `../..` shipped a sentinel. Unknown stays unknown — callers get undefined
 * and omit their widget, never print a made-up "0.0.0".
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "flusk";

function readAt(dir: string): string | undefined {
	try {
		const parsed = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
			name?: unknown;
			version?: unknown;
		};
		return parsed.name === NAME && typeof parsed.version === "string" ? parsed.version : undefined;
	} catch {
		return undefined; // absent or malformed at this level — keep walking
	}
}

function read(): string | undefined {
	let dir: string;
	try {
		dir = dirname(fileURLToPath(import.meta.url));
	} catch {
		return undefined; // non-file URL (odd bundler) — no anchor to walk from
	}
	for (;;) {
		const found = readAt(dir);
		if (found !== undefined) return found;
		const up = dirname(dir);
		if (up === dir) return undefined;
		dir = up;
	}
}

let cached: string | undefined;
let resolved = false;

/** The package version, read once. Never throws; undefined when no ancestor
 * directory holds flusk's own package.json. */
export function version(): string | undefined {
	if (!resolved) {
		cached = read();
		resolved = true;
	}
	return cached;
}
