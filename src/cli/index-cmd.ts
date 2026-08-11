/**
 * `ah index [--repo <path>]` — look at a repository and say what would help.
 *
 * Prints three things and never changes anything: what the repo is made of,
 * what it documents, and a worklist of suggestions each carrying the file that
 * justifies it. Applying a suggestion is a copy and a paste the reader
 * performs, because installing an MCP server, writing a skill or trusting a
 * project are all decisions that should be made by a person who saw why.
 */
import { relative } from "node:path";
import { loadConfig } from "../config/config.js";
import { advise } from "../profile/advise.js";
import { buildProfile } from "../profile/profile.js";
import type { Detected, Suggestion } from "../profile/types.js";

export interface IndexOpts {
	repo?: string;
	/** Print the whole thing as JSON, for a script or the workbench. */
	json?: boolean;
	out?: NodeJS.WritableStream;
}

const line = (out: NodeJS.WritableStream, s = ""): void => {
	out.write(`${s}\n`);
};

function group(out: NodeJS.WritableStream, title: string, items: Detected[]): void {
	if (items.length === 0) return;
	line(out, title);
	for (const d of items) {
		const cite = d.evidence.map((e) => `${e.file}: ${e.note}`).join("; ");
		line(out, `  ${d.name.padEnd(16)} ${cite}`);
	}
	line(out);
}

function suggestion(out: NodeJS.WritableStream, s: Suggestion): void {
	const mark = s.status === "present" ? "[have]" : "[    ]";
	line(out, `${mark} ${s.kind.toUpperCase().padEnd(6)} ${s.title}`);
	line(out, `       ${s.rationale}`);
	// The evidence is the point of the whole command; it is never elided.
	for (const e of s.why.slice(0, 4)) line(out, `       because ${e.file}: ${e.note}`);
	if (s.apply !== undefined && s.status === "missing") {
		line(out, `       add to ${s.apply.target}:`);
		for (const l of s.apply.content.split("\n")) line(out, `         ${l}`);
	}
	line(out);
}

export function indexCmd(opts: IndexOpts = {}): number {
	const out = opts.out ?? process.stdout;
	const root = opts.repo ?? process.cwd();
	const profile = buildProfile(root);
	const result = advise(profile, loadConfig(root));

	if (opts.json === true) {
		line(out, JSON.stringify(result, null, 2));
		return 0;
	}

	line(out, `${relative(process.cwd(), root) || "."}`);
	line(out);
	group(out, "STACK", profile.stack);
	group(out, "TOOLING", profile.tooling);
	group(out, "SERVICES", profile.services);

	if (profile.docs.length > 0) {
		line(out, "DOCS");
		for (const d of profile.docs) {
			line(out, `  ${d.kind.padEnd(7)} ${d.file.padEnd(28)} ${d.title}`);
		}
		line(out);
	}
	line(out, `VERIFY  ${profile.verify.join(" && ") || "(none declared)"}`);
	line(out);

	if (profile.unreadable.length > 0) {
		// A partial profile has to say it is partial, or its silence reads as
		// "there is nothing there".
		line(out, `UNREADABLE  ${profile.unreadable.join(", ")} — detections below may be incomplete`);
		line(out);
	}

	const missing = result.suggestions.filter((s) => s.status === "missing").length;
	line(out, `SUGGESTIONS  ${missing} to consider, ${result.suggestions.length - missing} already in place`);
	line(out);
	for (const s of result.suggestions) suggestion(out, s);
	line(out, "Nothing above was installed or written. Each block says where it goes.");
	return 0;
}
