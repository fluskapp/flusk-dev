import type { FluskConfig } from "../../platform/config/types.js";
import { classifyCommand } from "./classify.js";
import { resolveWithin } from "./paths.repository.js";
import type { Policy, PolicyAction, PolicyDecision } from "./policy.js";

const MAX_SUBAGENT_DEPTH = 2;

export interface HitPolicyOptions {
	config: FluskConfig;
	repoRoot: string;
	extraWriteRoots?: string[];
}

/**
 * The real unattended-run policy: bash goes through command classification,
 * file writes through the realpath jail, and subagents through a depth cap.
 */
export function createFluskPolicy(opts: HitPolicyOptions): Policy {
	const writeRoots = [opts.repoRoot, ...(opts.extraWriteRoots ?? [])];
	return {
		decide: (action: PolicyAction): PolicyDecision => decide(opts, writeRoots, action),
	};
}

function decide(
	opts: HitPolicyOptions,
	writeRoots: string[],
	action: PolicyAction,
): PolicyDecision {
	switch (action.kind) {
		case "bash":
			return decideBash(opts.config, opts.repoRoot, action.command);
		case "fileWrite": {
			try {
				resolveWithin(writeRoots, action.path, opts.repoRoot);
				return { allow: true };
			} catch (err) {
				return { allow: false, reason: err instanceof Error ? err.message : String(err) };
			}
		}
		case "subagent": {
			if (action.depth < MAX_SUBAGENT_DEPTH) return { allow: true };
			return {
				allow: false,
				reason: `subagent depth ${action.depth} reaches the cap of ${MAX_SUBAGENT_DEPTH}`,
			};
		}
	}
}

function decideBash(config: FluskConfig, repoRoot: string, command: string): PolicyDecision {
	const c = classifyCommand(command, repoRoot);
	if (c.class === "deny") return { allow: false, reason: `denied: ${c.reason}` };
	if (c.class === "unknown") {
		if (config.unattended.onUnknownCommand === "allow") return { allow: true };
		return { allow: false, reason: `unclassifiable command denied while unattended: ${c.reason}` };
	}
	return { allow: true };
}
