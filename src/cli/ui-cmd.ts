/**
 * `flusk ui` — launch the desktop workbench.
 *
 * Electron is the only shipped UI surface: this verb finds the app (the
 * packaged bundle when installed, `electron .` in a checkout) and hands off.
 * `--server` (and the automatic fallback when Electron is not installed) is
 * the headless loopback door: the SAME built app over plain HTTP when
 * dist-app exists (src/ui/app-serve.ts), the legacy page only without it.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fluskHome } from "../platform/paths/paths.js";
import { startUiServer } from "../ui/server.js";

export interface UiCmdOpts {
	port: number;
	open: boolean;
	/** Headless loopback server instead of the app (debugging/tests). */
	server?: boolean;
}

/** Signals a terminal or a supervisor uses to ask for a clean stop. */
const STOP_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/** The repo/package root: dist/cli/ui-cmd.js sits two levels below it. */
const packageRoot = (): string => join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function uiCmd(opts: UiCmdOpts): Promise<void> {
	if (opts.server !== true) {
		const root = packageRoot();
		const local = join(root, "node_modules", ".bin", "electron");
		if (existsSync(local)) {
			process.stdout.write(`flusk ui · launching the desktop app · sessions from ${fluskHome()}\n`);
			const child = spawn(local, [root], { stdio: "inherit" });
			await new Promise<void>((done) => child.once("exit", () => done()));
			return;
		}
		process.stderr.write(
			"flusk ui: the desktop app is not installed in this checkout (npm i); starting the headless server instead\n",
		);
	}
	await serveHeadless(opts);
}

/**
 * The old loopback server. The wait is a promise a signal resolves: the
 * server can have streaming agent CLIs attached, spawned detached, so the
 * tty's Ctrl-C reaches this process and nothing else. Closing the server
 * aborts them (src/ui/server.ts) — the only thing that stops a `claude -p`
 * from billing on after the dashboard is gone.
 */
async function serveHeadless(opts: UiCmdOpts): Promise<void> {
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
