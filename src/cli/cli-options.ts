/**
 * The flag table `flusk` parses argv with, kept beside main.ts so the dispatcher
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
	"no-extensions": { type: "boolean" }, // src/ext/types.ts's escape hatch
	list: { type: "boolean" },
	flow: { type: "string" },
	spec: { type: "string" }, // flusk run --spec <name>: the spec is the task
	template: { type: "string" }, // flusk spec new --template <feature|bugfix|refactor>
	quiet: { type: "boolean" },
	steer: { type: "string" },
	n: { type: "string", short: "n" },
	port: { type: "string" },
	server: { type: "boolean" },
	container: { type: "boolean" },
	schedule: { type: "boolean" }, // flusk maintain --schedule: print the cron/launchd line // flusk run --container: bash executes in the repo's container // flusk ui --server: headless loopback, not the app
	"no-open": { type: "boolean" },
	once: { type: "boolean" },
	project: { type: "string" },
	glob: { type: "string" },
	regex: { type: "boolean" },
	case: { type: "boolean" },
	limit: { type: "string" },
	budget: { type: "string" },
	json: { type: "boolean" },
	copy: { type: "boolean" },
	all: { type: "boolean" },
	refresh: { type: "boolean" },
} as const;
