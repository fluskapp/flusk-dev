import { spawn } from "node:child_process";
import { hitHome } from "../session/paths.js";
import { startUiServer } from "../ui/server.js";

export interface UiCmdOpts {
	port: number;
	open: boolean;
}

/** `hit ui` — serve the sessions dashboard until interrupted. */
export async function uiCmd(opts: UiCmdOpts): Promise<void> {
	const { url } = await startUiServer(opts.port);
	process.stdout.write(`hit ui · ${url} · sessions from ${hitHome()}\n`);
	if (opts.open && process.platform === "darwin") {
		spawn("open", [url], { stdio: "ignore", detached: true }).unref();
	}
	await new Promise<never>(() => {});
}
