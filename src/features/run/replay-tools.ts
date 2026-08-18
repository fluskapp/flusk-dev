import { resolve } from "node:path";
import type { SessionEntry } from "../session/entries.js";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** run-record.ts's counting rules, replayed over persisted message entries:
 * bash exits parsed from the "[exit code N]" output tail, writes/edits by
 * resolved path, deduplicated. Foreign session files may lack a repoRoot in
 * their header; without a cwd the raw recorded path is counted as-is rather
 * than dropping the whole replay. */
export function replayTools(entries: SessionEntry[], cwd: string | undefined) {
	const argsById = new Map<string, Record<string, unknown>>();
	const filesTouched: string[] = [];
	const commandsRun: Array<{ cmd: string; exit: number }> = [];
	for (const e of entries) {
		if (e.type !== "message") continue;
		const m = e.msg;
		if (m.role === "assistant") {
			for (const b of m.content) {
				if (b.type === "toolCall" && isObj(b.args)) argsById.set(b.id, b.args);
			}
		} else if (m.role === "toolResult") {
			const args = argsById.get(m.callId);
			argsById.delete(m.callId);
			if (m.name === "bash" && typeof args?.command === "string") {
				const exit = m.output.match(/\[exit code (\d+)\]\s*$/);
				commandsRun.push({ cmd: args.command, exit: exit ? Number(exit[1]) : m.isError ? 1 : 0 });
			} else if ((m.name === "write" || m.name === "edit") && !m.isError) {
				if (typeof args?.file_path !== "string") continue;
				const path = cwd === undefined ? args.file_path : resolve(cwd, args.file_path);
				if (!filesTouched.includes(path)) filesTouched.push(path);
			}
		}
	}
	return { filesTouched, commandsRun };
}
