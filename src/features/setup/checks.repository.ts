/**
 * The doctor's checks: each one names what it examined, what it found, and
 * the exact command that fixes it. A check never throws — a doctor that
 * crashes on the illness it was asked about is the joke this file avoids.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../../platform/config/config.js";
import { nativeDisabled, nativeModule } from "../../platform/native/native.repository.js";
import { fluskHome } from "../../platform/paths/paths.js";
import { loadIndex } from "../history/index-store.repository.js";
import type { SetupCheck } from "./setup.types.js";

const ok = (name: string, detail: string): SetupCheck => ({ name, status: "ok", detail });
const warn = (name: string, detail: string, fix: string): SetupCheck => ({ name, status: "warn", detail, fix });
const fail = (name: string, detail: string, fix: string): SetupCheck => ({ name, status: "fail", detail, fix });

const version = (cmd: string, args: string[]): string | null => {
	const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 10_000 });
	return r.status === 0 ? (r.stdout || r.stderr).trim().split("\n")[0] ?? null : null;
};

export function checkNode(): SetupCheck {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 22
		? ok("node", `v${process.versions.node}`)
		: fail("node", `v${process.versions.node} is below the required 22`, "install Node >= 22");
}

export function checkGit(): SetupCheck {
	const v = version("git", ["--version"]);
	return v !== null ? ok("git", v) : fail("git", "not on PATH", "install git — isolation depends on it");
}

export function checkDocker(): SetupCheck {
	const v = version("docker", ["--version"]);
	if (v === null) return warn("docker", "not on PATH", "install Docker to use `flusk run --container`");
	const up = spawnSync("docker", ["info"], { encoding: "utf8", timeout: 15_000 }).status === 0;
	return up ? ok("docker", v) : warn("docker", `${v}, daemon not reachable`, "start Docker Desktop (or the daemon)");
}

export function checkNative(): SetupCheck {
	if (nativeDisabled()) return warn("native", "FLUSK_NATIVE=0 forces TypeScript", "unset FLUSK_NATIVE to use the Rust engine");
	return nativeModule() !== null
		? ok("native", "prebuilt loaded; index/scan/render answer from Rust")
		: warn("native", "no prebuilt for this platform", "cargo build -p flusk-node --release (or reinstall)");
}

export function checkConfig(): SetupCheck {
	try {
		loadConfig(process.cwd());
		return ok("config", "global and repo layers parse");
	} catch (e) {
		return fail("config", e instanceof Error ? e.message : String(e), "fix the JSON the error names");
	}
}

const DAY_MS = 86_400_000;

export function checkIndex(now: number = Date.now()): SetupCheck {
	const index = loadIndex();
	if (index === null) return warn("index", "no history index on disk", "flusk search --refresh (or flusk maintain)");
	const age = now - Date.parse(index.builtAt);
	return age <= 7 * DAY_MS
		? ok("index", `${index.cards.length} cards, built ${index.builtAt}`)
		: warn("index", `stale: built ${index.builtAt}`, "flusk maintain refreshes it");
}

/** A lock file older than minutes is a crashed writer, not a busy one. */
export function checkStoreLocks(now: number = Date.now()): SetupCheck {
	const dir = join(fluskHome(), "store");
	if (!existsSync(dir)) return ok("store", "no store yet — nothing to lock");
	const stale = readdirSync(dir)
		.filter((f) => f.endsWith(".lock"))
		.filter((f) => now - statSync(join(dir, f)).mtimeMs > 10 * 60_000);
	return stale.length === 0
		? ok("store", "no stale locks")
		: fail("store", `stale lock(s): ${stale.join(", ")}`, `rm ${stale.map((f) => join(dir, f)).join(" ")}`);
}
