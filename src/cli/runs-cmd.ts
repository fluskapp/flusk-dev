import { scanSessions } from "../features/projects/scan.repository.js";

export interface RunsCmdOpts {
	limit?: number;
	out?: NodeJS.WritableStream;
}

const TASK_MAX = 46;

function pad(text: string, width: number): string {
	return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function truncateTask(task: string): string {
	const oneLine = task.replace(/\s+/g, " ").trim();
	return oneLine.length > TASK_MAX ? `${oneLine.slice(0, TASK_MAX - 1)}…` : oneLine;
}

/** `flusk runs [-n 20]` — newest-first table of recorded runs (linof runs parity). */
export function runsCmd(opts: RunsCmdOpts = {}): void {
	const out = opts.out ?? process.stdout;
	const rows = scanSessions().slice(0, opts.limit ?? 20);
	if (rows.length === 0) {
		out.write("no runs recorded\n");
		return;
	}
	out.write(
		`${pad("TIME", 18)}${pad("STATUS", 11)}${pad("TURNS", 7)}${pad("COST", 9)}${pad("TASK", TASK_MAX + 2)}ID\n`,
	);
	for (const r of rows) {
		const time = r.createdAt.slice(0, 16).replace("T", " ");
		out.write(
			pad(time, 18) +
				pad(r.status, 11) +
				pad(String(r.turns), 7) +
				pad(`$${r.costUsd.toFixed(2)}`, 9) +
				pad(truncateTask(r.task), TASK_MAX + 2) +
				`${r.sessionId}\n`,
		);
	}
}
