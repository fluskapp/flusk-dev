/**
 * One file's header + body → one validated `AgentSpec`, or one reason it was
 * refused. Nothing partial: a spec that reaches the registry is complete.
 *
 * `scope` and `source` are arguments, NEVER fields: they are derived from the
 * directory the file was found in, so a `scope: builtin` line in a repo's
 * spec is read and ignored — a file cannot promote itself out of the layer it
 * was cloned into. `backendId`/`model` are dropped for `worker: "internal"`,
 * which inherits the parent run's provider, so no downstream reader can be
 * tempted by a value that has no meaning there.
 *
 * The body becomes `prompt`: text handed to a model. It is never eval'd,
 * imported, or passed to a shell, which is exactly why a project-scoped spec
 * may load at all while `<repo>/.ah/extensions/*.js` may not.
 */

import { parseSpecFile } from "./frontmatter.js";
import { isValidAgentName } from "./spec-name.js";
import type { AgentScope, AgentSpec, AgentWorkerKind } from "./types.js";

export type SpecParse = { ok: true; spec: AgentSpec } | { ok: false; reason: string };

const WORKERS: ReadonlySet<string> = new Set<AgentWorkerKind>(["internal", "cli", "http"]);

function fail(reason: string): SpecParse {
	return { ok: false, reason };
}

/** Deduped, order-preserving; a tool name is a `Tool.name`, never a pattern. */
function toolList(raw: string[] | undefined): string[] | undefined {
	if (raw === undefined) return undefined;
	return [...new Set(raw.map((t) => t.trim()).filter((t) => t !== ""))];
}

export function parseAgentSpec(text: string, source: string, scope: AgentScope): SpecParse {
	const parsed = parseSpecFile(text);
	if (!parsed.ok) return fail(parsed.reason);
	const { fields, lists, body } = parsed.file;

	const name = fields.name ?? "";
	if (name === "") return fail("missing `name`");
	if (!isValidAgentName(name)) return fail(`name "${name}" is not kebab-case [a-z0-9-]`);

	const description = fields.description ?? "";
	if (description === "") return fail("missing `description` (it must say WHEN to use this agent)");

	// Absent `worker` means "internal": the least-privileged kind, which runs
	// ah's own loop on the parent's provider and can name no binary at all.
	const worker = fields.worker ?? "internal";
	if (!WORKERS.has(worker)) return fail(`unknown worker "${worker}" (internal|cli|http)`);

	if (body === "") return fail("empty body: the markdown body IS the system prompt");

	const kind = worker as AgentWorkerKind;
	const backendId = fields.backendId ?? "";
	if (kind !== "internal" && backendId === "") return fail(`worker "${kind}" requires a backendId`);
	const tools = toolList(lists.tools);
	return {
		ok: true,
		spec: {
			name,
			description,
			worker: kind,
			...(kind === "internal" ? {} : { backendId }),
			...(kind !== "internal" && fields.model !== undefined ? { model: fields.model } : {}),
			...(tools !== undefined ? { tools } : {}),
			prompt: body,
			source,
			scope,
		},
	};
}
