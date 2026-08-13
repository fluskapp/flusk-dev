/**
 * Session scanning behind the native seam: the sessions tree in, summaries
 * out, whoever answers. The Rust port reads and parses the ~500 JSONL
 * transcripts off the main thread when the prebuilt exists; the TypeScript
 * reference (features/projects/scan.repository) answers otherwise, always
 * under FLUSK_NATIVE=0, and whenever the native call fails — silently.
 */
import {
	scanSessions,
	type SessionSummary,
	sessionsRoot,
} from "../../features/projects/scan.repository.js";
import { nativeModule } from "./native.repository.js";

/** Scan-stage exports the prebuilt MAY carry; a stale binary lacks them. */
interface ScanNative {
	scanSessionsJson?(rootDir: string): Promise<string>;
}

export interface SessionScanner {
	scan(): Promise<SessionSummary[]>;
	/** Which implementation is answering — surfaced in logs and tests only. */
	readonly impl: "native" | "ts";
}

/**
 * The TS reference always walks sessionsRoot() (FLUSK_HOME); `root` exists so
 * the native path reads the same tree, and must not point anywhere else.
 */
export function createSessionScanner(root: string = sessionsRoot()): SessionScanner {
	const native = nativeModule() as ScanNative | null;
	if (native === null || typeof native.scanSessionsJson !== "function") {
		return { impl: "ts", scan: async () => scanSessions() };
	}
	const scanNative = native.scanSessionsJson.bind(native);
	return {
		impl: "native",
		scan: async () => {
			try {
				return JSON.parse(await scanNative(root)) as SessionSummary[];
			} catch {
				// Never let a native failure take the dashboard down.
				return scanSessions();
			}
		},
	};
}
