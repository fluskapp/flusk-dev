/** One `.flusk/harnesses/<id>.json` (id = file stem) or a built-in. */
export type HarnessKind = "claude-code" | "codex" | "script";
export type HarnessStream = "text" | "claude-stream-json";

export interface HarnessSpec {
	type: "harness"; // v1 discriminant
	kind: HarnessKind;
	/** Binary name or path; resolved via PATH (`which`), never a shell. */
	command: string;
	/** argv prefix; the prompt is appended as ONE argv element (S4 rule). */
	args?: string[];
	/** Extra env for the child. Only honored from trusted scopes (D4). */
	env?: Record<string, string>;
	/** Default by kind: claude-code → "claude-stream-json", else "text". */
	stream?: HarnessStream;
	limits?: { maxMinutes?: number };
}

export interface HarnessMeta extends HarnessSpec {
	id: string;
	scope: "builtin" | "global" | "project";
	/** null for built-ins. */
	path: string | null;
	/** PATH probe AND trust verdict; false rows still list (detect idiom). */
	available: boolean;
	note?: string;
}

export interface HarnessScan {
	harnesses: HarnessMeta[];
	skipped: Array<{ path: string; why: string }>;
}

export const HARNESS_DIR = ".flusk/harnesses";
