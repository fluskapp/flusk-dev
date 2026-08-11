/**
 * The flag table `ah` parses argv with, kept beside main.ts so the dispatcher
 * is only its table of commands. Every subcommand's own validation lives in
 * its *-args.ts module (run-args.ts, flow-args.ts); this is just the shape.
 */
export const CLI_OPTIONS = {
	repo: { type: "string" },
	fake: { type: "string" },
	model: { type: "string" },
	kind: { type: "string" },
	"max-cost": { type: "string" },
	for: { type: "string" },
	"max-turns": { type: "string" },
	dry: { type: "boolean" },
	"no-isolation": { type: "boolean" },
	"allow-dirty": { type: "boolean" },
	"no-verify": { type: "boolean" },
	list: { type: "boolean" },
	flow: { type: "string" },
	quiet: { type: "boolean" },
	steer: { type: "string" },
	n: { type: "string", short: "n" },
	port: { type: "string" },
	"no-open": { type: "boolean" },
	once: { type: "boolean" },
	project: { type: "string" },
	limit: { type: "string" },
	budget: { type: "string" },
	json: { type: "boolean" },
	copy: { type: "boolean" },
	all: { type: "boolean" },
	refresh: { type: "boolean" },
} as const;
