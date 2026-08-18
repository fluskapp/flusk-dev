/**
 * The two built-in harnesses, synthesized from a PATH probe — the chat
 * detect idiom (detect.repository.ts): an absent binary is a LISTED row
 * carrying a note naming exactly what is missing, never a hidden one.
 */
import { which } from "../chat/detect.repository.js";
import type { HarnessMeta } from "./harness.types.js";

/** Mirrors DEFAULT_CLIS: the flags that make each CLI one-shot. */
const BUILTINS: ReadonlyArray<Pick<HarnessMeta, "id" | "kind" | "command" | "args" | "stream">> = [
	{
		id: "claude-code",
		kind: "claude-code",
		command: "claude",
		args: ["-p", "--output-format", "stream-json", "--include-partial-messages", "--verbose"],
		stream: "claude-stream-json",
	},
	{ id: "codex", kind: "codex", command: "codex", args: ["exec"], stream: "text" },
];

/** Built-in rows, PATH-probed fresh on every call. */
export function builtinHarnesses(): HarnessMeta[] {
	return BUILTINS.map((b) => {
		const found = which(b.command) !== null;
		return {
			type: "harness",
			...b,
			scope: "builtin",
			path: null,
			available: found,
			...(found ? {} : { note: `${b.command} not found on PATH` }),
		};
	});
}
