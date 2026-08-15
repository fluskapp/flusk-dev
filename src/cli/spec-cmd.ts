/**
 * `flusk spec new <name> [--template <t>]` and `flusk spec list` — the CLI
 * half of spec-driven work (docs/experience.md). Scaffolding refuses to
 * overwrite: a spec is authored intent, and `new` must never eat one.
 */
import { parseArgs } from "node:util";
import { scanSpecs, createSpecFile } from "../features/specs/spec-files.repository.js";
import { renderSpecTemplate } from "../features/specs/spec-templates.js";
import { SPEC_DIR, SPEC_TEMPLATES, type SpecTemplate } from "../features/specs/spec.types.js";
import { CLI_OPTIONS } from "./cli-options.js";

export interface SpecCmdArgs {
	repo: string;
	template?: string | undefined;
	json?: boolean | undefined;
	out?: NodeJS.WritableStream;
}

const SPEC_USAGE = `Usage:
  flusk spec new <name> [--template <feature|bugfix|refactor>] [--repo <path>]
  flusk spec list [--repo <path>] [--json]
`;

/**
 * main.ts hands query commands only two positionals; `spec new <name>` has a
 * third. Re-parsing the argv main.ts already parsed (same table) cannot fail
 * differently, and keeps main.ts's signature out of this slice.
 */
export function specNameArg(): string | undefined {
	try {
		const { positionals } = parseArgs({
			args: process.argv.slice(2),
			allowPositionals: true,
			options: CLI_OPTIONS,
		});
		return positionals[2];
	} catch {
		return undefined;
	}
}

function listSpecs(args: SpecCmdArgs, out: NodeJS.WritableStream): number {
	const scan = scanSpecs(args.repo);
	if (args.json === true) {
		out.write(`${JSON.stringify(scan, null, 2)}\n`);
		return 0;
	}
	if (scan.specs.length === 0 && scan.skipped.length === 0) {
		out.write(`no specs in ${SPEC_DIR} — start one: flusk spec new <name>\n`);
		return 0;
	}
	for (const s of scan.specs) {
		out.write(`${s.name.padEnd(24)} ${s.status.padEnd(10)} ${s.mode.padEnd(12)} ${s.title}\n`);
	}
	for (const s of scan.skipped) out.write(`skipped: ${s.path} — ${s.why}\n`);
	return 0;
}

function newSpec(name: string, args: SpecCmdArgs, out: NodeJS.WritableStream): number {
	const template = args.template ?? "feature";
	if (!(SPEC_TEMPLATES as readonly string[]).includes(template)) {
		out.write(`flusk: --template must be ${SPEC_TEMPLATES.join(", ")}\n`);
		return 2;
	}
	let path: string;
	try {
		path = createSpecFile(args.repo, name, renderSpecTemplate(template as SpecTemplate, name));
	} catch (e) {
		const exists = (e as NodeJS.ErrnoException).code === "EEXIST";
		out.write(`flusk: ${exists ? `spec "${name}" already exists at ${SPEC_DIR}/${name}.md` : e instanceof Error ? e.message : String(e)}\n`);
		return 1;
	}
	out.write(`created ${path} (${template} template) — edit it, then: flusk run <task> --spec ${name}\n`);
	return 0;
}

export function specCmd(
	sub: string | undefined,
	name: string | undefined,
	args: SpecCmdArgs,
): number {
	const out = args.out ?? process.stdout;
	if (sub === "list") return listSpecs(args, out);
	if (sub === "new") {
		if (name === undefined) {
			out.write(`flusk: spec new needs a name\n${SPEC_USAGE}`);
			return 2;
		}
		return newSpec(name, args, out);
	}
	out.write(SPEC_USAGE);
	return 2;
}
