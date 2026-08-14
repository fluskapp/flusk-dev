/**
 * The run feature's server-route seam. A bare value re-export in a
 * *.functions.ts file survives the Start compiler's server-fn stripping and
 * drags node:* into the CLIENT bundle (it broke the build once — this file
 * is the fix). Server routes are server-only, so the live feed is theirs to
 * import from here; client routes stay on run.functions.ts.
 */
export { getLiveRun } from "./run-manager.repository.js";
