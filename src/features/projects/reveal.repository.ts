/**
 * The one subprocess the sessions router starts: macOS Finder reveal. The
 * router validated the path against the scanner's index before calling; this
 * file exists so the router itself never imports node:child_process.
 */
import { spawn } from "node:child_process";

/** Fire-and-forget `open -R`; the caller owns platform and path checks. */
export function revealInFinder(path: string): void {
	spawn("open", ["-R", path], { stdio: "ignore", detached: true }).unref();
}
