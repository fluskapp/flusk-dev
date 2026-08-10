import { resolve } from "node:path";
import type { EventBus } from "./events.js";

/**
 * Collects the RunRecord evidence trail off the event bus: bash commands with
 * exit codes (parsed from bash's "[exit code N]" output tail, since the frozen
 * tool:end event carries no details) and resolved paths of successful writes/edits.
 */
export function collectRunRecord(events: EventBus, cwd: string) {
	const argsById = new Map<string, Record<string, unknown>>();
	const filesTouched: string[] = [];
	const commandsRun: Array<{ cmd: string; exit: number }> = [];
	const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
	const offs = [
		events.on("tool:start", (e) => {
			if (isObj(e.args)) argsById.set(e.callId, e.args);
		}),
		events.on("tool:end", (e) => {
			const args = argsById.get(e.callId);
			argsById.delete(e.callId);
			if (e.name === "bash" && typeof args?.command === "string") {
				const exit = e.output.match(/\[exit code (\d+)\]\s*$/);
				commandsRun.push({ cmd: args.command, exit: exit ? Number(exit[1]) : e.isError ? 1 : 0 });
			} else if ((e.name === "write" || e.name === "edit") && !e.isError) {
				if (typeof args?.file_path !== "string") return;
				const path = resolve(cwd, args.file_path);
				if (!filesTouched.includes(path)) filesTouched.push(path);
			}
		}),
	];
	const stop = () => {
		for (const off of offs) off();
	};
	return { filesTouched, commandsRun, stop };
}
