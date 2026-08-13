/**
 * The session file behind the native seam — TS-default, like the fact store
 * and unlike every other stage: session files are run history that cannot be
 * regenerated, so Rust answers only under an explicit FLUSK_NATIVE=1 until
 * the durability harness has proven equivalence. A missing or broken binary
 * degrades to the TypeScript reference silently.
 *
 * Serialization never crosses the seam: whichever side answers, the entry is
 * JSON.stringify-ed HERE, so the bytes on disk are identical by construction
 * and the native side owns exactly the durability primitives — append,
 * fsync, and the torn-tail-tolerant read.
 */
import type { SessionEntry } from "../../features/session/entries.js";
import { SessionStore } from "../../features/session/session.repository.js";
import { nativeModule } from "./native.repository.js";

interface NativeSessionFile {
	appendLine(jsonLine: string): void;
	close(): void;
}

interface SessionNativeModule {
	openSessionFile(path: string): NativeSessionFile;
	readSessionLines(path: string): string[];
}

export interface SessionFileHandle {
	readonly path: string;
	/** Which implementation is answering — surfaced in logs and tests only. */
	readonly impl: "native" | "ts";
	appendEntry(entry: SessionEntry): void;
	close(): void;
}

/** Opt-in, not opt-out: native only when the user explicitly asked for it. */
const sessionNativeModule = (): SessionNativeModule | null => {
	if (process.env.FLUSK_NATIVE !== "1") return null;
	const mod = nativeModule() as unknown as Partial<SessionNativeModule> | null;
	return mod !== null &&
		typeof mod.openSessionFile === "function" &&
		typeof mod.readSessionLines === "function"
		? (mod as SessionNativeModule)
		: null;
};

/** Append-only handle; every append is durable (fsynced) when it returns. */
export function openSessionFile(path: string): SessionFileHandle {
	const native = sessionNativeModule();
	if (native !== null) {
		try {
			const file = native.openSessionFile(path);
			return {
				path,
				impl: "native",
				appendEntry: (entry) => file.appendLine(JSON.stringify(entry)),
				close: () => file.close(),
			};
		} catch {
			// Fall through: a store that cannot open natively still must open.
		}
	}
	const store = SessionStore.open(path);
	return {
		path,
		impl: "ts",
		appendEntry: (entry) => store.appendEntry(entry),
		close: () => store.close(),
	};
}

/**
 * Parse a session file: malformed interior lines throw with their 1-based
 * line number, a malformed FINAL line is the torn tail of a crashed append
 * and is dropped — identical wording and behavior on both paths.
 */
export function readSessionFile(path: string): SessionEntry[] {
	const native = sessionNativeModule();
	if (native === null) return SessionStore.read(path);
	return native.readSessionLines(path).map((line) => JSON.parse(line) as SessionEntry);
}
