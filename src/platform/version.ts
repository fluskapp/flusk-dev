/**
 * The one place the shipped version number comes from.
 *
 * It used to be typed into the status bar by hand, which meant the workbench
 * could claim a version the package had long since moved past. Reading
 * package.json costs one file read at startup and removes the whole class of
 * "the UI says 0.1.0" bug.
 *
 * The path is resolved from this module, not from cwd: `src/platform/` and
 * `dist/platform/` are both exactly two levels below the package root, so the
 * same expression works in tests and in the built binary.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK = "0.0.0";

function read(): string {
	try {
		const here = dirname(fileURLToPath(import.meta.url));
		const raw = readFileSync(join(here, "..", "..", "package.json"), "utf8");
		const parsed = JSON.parse(raw) as { version?: unknown };
		return typeof parsed.version === "string" ? parsed.version : FALLBACK;
	} catch {
		return FALLBACK;
	}
}

let cached: string | undefined;

/** The package version, read once. Never throws; falls back to "0.0.0". */
export function version(): string {
	if (cached === undefined) cached = read();
	return cached;
}
