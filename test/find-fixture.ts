/**
 * A throwaway project tree for the search tests, plus one directory the config
 * deliberately does NOT cover — the control for "a query cannot escape the
 * configured roots". Nothing here reads the developer's real home.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import type { FluskConfig } from "../src/platform/config/types.js";

/** ripgrep is required by the feature; tests skip rather than fail without it. */
export function hasRg(): boolean {
	try {
		execFileSync("rg", ["--version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

export function put(root: string, rel: string, body: string): string {
	const path = join(root, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
	return path;
}

export interface FindTree {
	/** The directory `ui.projectDirs` globs — its children are the projects. */
	work: string;
	/** Absolute path of a file holding "needle", OUTSIDE every configured root. */
	outsideFile: string;
	outside: string;
	home: string;
	cfg: FluskConfig;
	cleanup: () => void;
}

/** The long line's needle sits past the 400-char transport cap on purpose. */
export const LONG_PREFIX = "x".repeat(500);
/** Bytes 14..20, characters 12..18 — the whole point of the range conversion. */
export const UNICODE_LINE = "héllo wörld needle here";

export function findTree(): FindTree {
	const home = mkdtempSync(join(tmpdir(), "flusk-find-home-"));
	const work = mkdtempSync(join(tmpdir(), "flusk-find-work-"));
	const outside = mkdtempSync(join(tmpdir(), "flusk-find-outside-"));
	process.env.FLUSK_HOME = home;

	const alpha = join(work, "alpha");
	put(alpha, "src/client-list.ts", "const needle = 1;\nconst other = 2;\nfind the NEEDLE again\n");
	put(alpha, "src/uni.txt", `${UNICODE_LINE}\n`);
	put(alpha, "src/long.txt", `${LONG_PREFIX}needle${"y".repeat(50)}\n`);
	put(alpha, "docs/notes.md", "# Notes\n\na needle in markdown\n");
	put(alpha, "src/ui/client-list.ts", "// ui needle\n");
	// `n.edle` is a literal on one line and a regex for the other: the pair
	// that makes "-F unless --regex" observable rather than assumed.
	put(join(work, "beta"), "lib/two.ts", "beta needle here\na n.edle literal\n");

	const outsideFile = put(outside, "secret.txt", "needle secret\n");
	const cfg: FluskConfig = {
		...structuredClone(DEFAULT_CONFIG),
		ui: { harnessDirs: [], projectDirs: [join(work, "*")], liveTailEvents: 400 },
	};
	writeFileSync(join(home, "config.json"), JSON.stringify({ ui: cfg.ui }));
	return {
		work,
		outside,
		outsideFile,
		home,
		cfg,
		cleanup: () => {
			delete process.env.FLUSK_HOME;
			for (const dir of [home, work, outside]) rmSync(dir, { recursive: true, force: true });
		},
	};
}
