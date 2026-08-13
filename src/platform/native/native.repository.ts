/**
 * The one place the Rust binary is found and loaded. Everything above this
 * file sees an interface; whether Rust or TypeScript answers is decided here,
 * once, from two inputs: does a prebuilt exist for this platform, and has the
 * user said FLUSK_NATIVE=0.
 *
 * The kill switch is a RUNTIME guarantee, not a build flavour: the TS
 * reference implementations stay in the tree and load on demand, so a bad
 * native build can always be routed around in the field with one env var.
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export interface NativeHistoryEngine {
	searchJson(queryJson: string, optsJson?: string): string;
	readonly cards: number;
}

interface NativeModule {
	buildHistoryEngineSync(cardsJson: string): NativeHistoryEngine;
	buildHistoryEngine(cardsJson: string): Promise<NativeHistoryEngine>;
}

export const nativeDisabled = (): boolean => process.env.FLUSK_NATIVE === "0";

function prebuiltPath(): string {
	const file = `flusk-node.${process.platform}-${process.arch}.node`;
	// FLUSK_NATIVE_DIR: where packaging places the binary (Electron resources).
	if (process.env.FLUSK_NATIVE_DIR !== undefined) return join(process.env.FLUSK_NATIVE_DIR, file);
	// This module runs from src/ (tests) and dist/ (built) — both three levels
	// below the package root, where the checked-in prebuilt lives under src/.
	const here = dirname(fileURLToPath(import.meta.url));
	return join(here, "..", "..", "..", "src", "platform", "native", "prebuilt", file);
}

let cached: NativeModule | null | undefined;

/** The binding, or null when absent/disabled — cached for the process. */
export function nativeModule(): NativeModule | null {
	if (nativeDisabled()) return null;
	if (cached !== undefined) return cached;
	const path = prebuiltPath();
	if (!existsSync(path)) {
		cached = null;
		return cached;
	}
	try {
		cached = require(path) as NativeModule;
	} catch {
		// A binary for the wrong ABI must degrade to TypeScript, not crash.
		cached = null;
	}
	return cached;
}
