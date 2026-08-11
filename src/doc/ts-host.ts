/**
 * The LanguageServiceHost: a language service's view of the real filesystem,
 * plus the two things that keep it bounded — a deadline enforced through the
 * cancellation token, and a `built` flag so callers can be told "indexing".
 *
 * Two deadlines, not one, and that separation is the point. TypeScript does
 * NOT poll the cancellation token while it BUILDS the program, so a query
 * deadline applied to the first call bounds nothing — it expires during a
 * build it cannot interrupt, and every later lookup then fails fast with
 * `built` still false, poisoning the service while the UI says "no symbol at
 * this position". So the build gets its own generous budget (`warmup`), the
 * recurring budget guards QUERY work only, and `run` answers a discriminated
 * result that says which deadline lapsed, never a bare null.
 *
 * Split from ts-service.ts, which owns the lifecycle and the LRU.
 */
import { readFileSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import type { ProjectConfig } from "./ts-project.js";

type TS = typeof import("typescript");
type LS = import("typescript").LanguageService;

/** Never a bare null: a refusal that cannot say why reads as "no symbol". */
export type RunResult<T> = { ok: true; value: T } | { ok: false; reason: string };
export type ServiceEvent = "indexing" | "ready" | "refused";

export interface ServiceLimits {
	/** Budget for one query once the program exists. */
	timeoutMs: number;
	/** Budget for the first program build, which cannot be interrupted. */
	warmupMs: number;
}

export interface DocService {
	root: string;
	ts: TS;
	/** True once the program has been built at least once. */
	ready(): boolean;
	/** Builds the program under the warm-up budget. False when it did not. */
	warmup(): boolean;
	/** Runs `fn` under the query deadline once the program exists. */
	run<T>(fn: (service: LS, ts: TS) => T): RunResult<T>;
	/** Pulls a file that appeared after startup into the project. */
	include(file: string): void;
	dispose(): void;
}

function versionOf(file: string): string {
	try {
		const s = statSync(file);
		return `${s.mtimeMs}:${s.size}`;
	} catch {
		return "0"; // deleted or unreadable: a stable version, no snapshot
	}
}

const secs = (ms: number): string => `${Math.max(1, Math.round(ms / 1000))}s`;
const indexingSlow = (ms: number): string => `indexing this project exceeded ${secs(ms)}`;

export function makeService(
	ts: TS,
	root: string,
	cfg: ProjectConfig,
	limits: ServiceLimits,
	onState: (state: ServiceEvent, reason?: string) => void,
): DocService {
	const files = new Set(cfg.files.map((f) => resolve(f)));
	let deadline = Number.POSITIVE_INFINITY;
	let built = false;
	let disposed = false;
	const service = ts.createLanguageService({
		getScriptFileNames: () => [...files],
		getScriptVersion: versionOf,
		getScriptSnapshot: (file) => {
			try {
				return ts.ScriptSnapshot.fromString(readFileSync(file, "utf8"));
			} catch {
				return undefined;
			}
		},
		getCurrentDirectory: () => root,
		getCompilationSettings: () => cfg.options,
		getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
		fileExists: ts.sys.fileExists,
		readFile: ts.sys.readFile,
		readDirectory: ts.sys.readDirectory,
		directoryExists: ts.sys.directoryExists,
		getDirectories: ts.sys.getDirectories,
		// Synchronous work cannot be aborted from outside; TypeScript polls this
		// token between units of work, which is what makes the deadline real.
		getCancellationToken: () => ({ isCancellationRequested: () => Date.now() > deadline }),
	});
	const warmup = (): boolean => {
		if (built) return true;
		onState("indexing");
		deadline = Date.now() + limits.warmupMs;
		try {
			service.getProgram();
			built = true;
			onState("ready");
			return true;
		} catch {
			onState("refused", indexingSlow(limits.warmupMs));
			return false;
		} finally {
			deadline = Number.POSITIVE_INFINITY;
		}
	};
	return {
		root,
		ts,
		ready: () => built,
		warmup,
		include(file) {
			// The separator matters: without it /repo-other/x.ts is inside /repo.
			const path = resolve(file);
			if ((path === root || path.startsWith(root + sep)) && !files.has(path)) files.add(path);
		},
		run(fn) {
			// A disposed service must stay dead. ts's own dispose() only drops the
			// program; calling in again would rebuild it, quietly restoring the
			// memory the LRU just gave back.
			const closed = "this project's documentation service closed";
			if (disposed) return { ok: false, reason: closed };
			if (!warmup()) return { ok: false, reason: indexingSlow(limits.warmupMs) };
			deadline = Date.now() + limits.timeoutMs;
			try {
				const value = fn(service, ts);
				onState("ready");
				return { ok: true, value };
			} catch {
				const late = Date.now() > deadline;
				return {
					ok: false,
					reason: late
						? `this lookup exceeded ${secs(limits.timeoutMs)}`
						: "the language service could not answer here",
				};
			} finally {
				deadline = Number.POSITIVE_INFINITY;
			}
		},
		dispose() {
			disposed = true;
			service.dispose();
			files.clear();
		},
	};
}
