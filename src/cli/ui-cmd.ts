import { spawn } from "node:child_process";
import { fluskHome } from "../platform/paths/paths.js";
import { startUiServer } from "../ui/server.js";

export interface UiCmdOpts {
	port: number;
	open: boolean;
}

/** Signals a terminal or a supervisor uses to ask for a clean stop. */
const STOP_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/**
 * `flusk ui` — serve the dashboard until interrupted.
 *
 * The wait is a promise a signal resolves, not one that never settles: the
 * server can have streaming agent CLIs attached to it, and those are spawned
 * detached, so the tty's Ctrl-C reaches this process and nothing else. Closing
 * the server aborts them (src/ui/server.ts), which is the only thing that
 * stops a `claude -p` from billing on after the dashboard is gone.
 */
export async function uiCmd(opts: UiCmdOpts): Promise<void> {
	const ui = await startUiServer(opts.port);
	process.stdout.write(`flusk ui · ${ui.url} · sessions from ${fluskHome()}\n`);
	if (opts.open && process.platform === "darwin") {
		spawn("open", [ui.url], { stdio: "ignore", detached: true }).unref();
	}
	await new Promise<void>((done) => {
		let stopping = false;
		const stop = (signal: string): void => {
			if (stopping) return; // a second Ctrl-C must not race the first close
			stopping = true;
			process.stdout.write(`\n${signal} · stopping flusk ui\n`);
			void ui.close().then(
				() => done(),
				() => done(),
			);
		};
		for (const signal of STOP_SIGNALS) process.once(signal, () => stop(signal));
	});
}
