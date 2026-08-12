/**
 * The structured logger. Until now output was `process.stdout.write` in the
 * CLI and nothing at all in the server; Electron makes that untenable — a
 * desktop app has no terminal, so a problem nobody can see is a problem
 * nobody can report.
 *
 * JSON lines to `~/.flusk/logs/flusk-<date>.jsonl`, pretty lines to stderr
 * when it is a TTY, levels from FLUSK_LOG (debug|info|warn|error; default
 * info). One hard rule inherited from the rest of the codebase: every string
 * runs through the same secret scrubber as indexed history, so a token in an
 * error message does not land in a log file.
 *
 * Writes are fire-and-forget appends: a logger that can block the agent loop
 * on disk I/O is a logger that becomes the slowest part of the program.
 */
import { appendFile, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fluskHome } from "../paths/paths.js";
import { redact } from "./scrub.js";

export type Level = "debug" | "info" | "warn" | "error";

const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function threshold(): Level {
	const l = process.env.FLUSK_LOG;
	return l === "debug" || l === "info" || l === "warn" || l === "error" ? l : "info";
}

export interface Logger {
	debug(msg: string, data?: Record<string, unknown>): void;
	info(msg: string, data?: Record<string, unknown>): void;
	warn(msg: string, data?: Record<string, unknown>): void;
	error(msg: string, data?: Record<string, unknown>): void;
	/** A named child; its records carry `feature: "<parent>.<name>"`. */
	child(name: string): Logger;
}

/** Everything stringy in `data` is scrubbed; structure is preserved. */
function scrubValue(v: unknown): unknown {
	if (typeof v === "string") return redact(v);
	if (Array.isArray(v)) return v.map(scrubValue);
	if (typeof v === "object" && v !== null) {
		return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrubValue(x)]));
	}
	return v;
}

/** The dir already ensured — keyed by path, since FLUSK_HOME can move in tests. */
let readyDir = "";

function logFile(now: Date): string {
	const dir = join(fluskHome(), "logs");
	if (readyDir !== dir) {
		try {
			mkdirSync(dir, { recursive: true });
			readyDir = dir;
		} catch {
			/* an unwritable log dir must never take the program down with it */
		}
	}
	return join(dir, `flusk-${now.toISOString().slice(0, 10)}.jsonl`);
}

/** Swallows write errors by design: logging is never worth crashing for. */
function emit(feature: string, level: Level, msg: string, data?: Record<string, unknown>): void {
	if (RANK[level] < RANK[threshold()]) return;
	const now = new Date();
	const record = {
		at: now.toISOString(),
		level,
		feature,
		msg: redact(msg),
		...(data === undefined ? {} : { data: scrubValue(data) as Record<string, unknown> }),
	};
	appendFile(logFile(now), `${JSON.stringify(record)}\n`, () => {});
	if (process.stderr.isTTY) {
		const extra = data === undefined ? "" : ` ${JSON.stringify(record.data)}`;
		process.stderr.write(`${record.at} ${level.padEnd(5)} [${feature}] ${record.msg}${extra}\n`);
	}
}

export function createLogger(feature: string): Logger {
	return {
		debug: (msg, data) => emit(feature, "debug", msg, data),
		info: (msg, data) => emit(feature, "info", msg, data),
		warn: (msg, data) => emit(feature, "warn", msg, data),
		error: (msg, data) => emit(feature, "error", msg, data),
		child: (name) => createLogger(`${feature}.${name}`),
	};
}
