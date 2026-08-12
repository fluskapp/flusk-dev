export type PolicyAction =
	| { kind: "bash"; command: string }
	| { kind: "fileWrite"; path: string }
	| { kind: "subagent"; depth: number };

export type PolicyDecision = { allow: true } | { allow: false; reason: string };

/**
 * Tools ask the policy before dangerous acts; a denial becomes the tool's
 * error output so the model can adjust. Phase 2 replaces the stub with
 * command classification, a realpath jail, git isolation, and budgets.
 */
export interface Policy {
	decide(action: PolicyAction): PolicyDecision;
}

export const allowAllPolicy: Policy = {
	decide: () => ({ allow: true }),
};
