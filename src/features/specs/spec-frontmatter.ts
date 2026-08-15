/**
 * A spec file's frontmatter, parsed by hand: fixed scalar keys plus one
 * `acceptance:` list — the same no-YAML-dependency idiom as
 * features/projects/journal-frontmatter.ts, with one difference: a refusal
 * carries its reason, because the Specs surface must say WHY a spec is
 * missing rather than quietly showing one fewer.
 */
import type { SpecMode, SpecStatus } from "./spec.types.js";

export const SPEC_STATUSES: readonly SpecStatus[] = [
	"draft",
	"planned",
	"building",
	"verifying",
	"done",
];
export const SPEC_MODES: readonly SpecMode[] = ["plan", "architecture", "refactor", "build"];

/** The file's own halves: the harness's frontmatter, the author's body. */
export interface SpecFile {
	title?: string;
	status: SpecStatus;
	mode: SpecMode;
	acceptance: string[];
	/** Everything below the closing fence, verbatim. */
	body: string;
}

export type SpecParse = { ok: true; spec: SpecFile } | { ok: false; why: string };

const unquote = (v: string): string => {
	const t = v.trim();
	return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
};

/**
 * Missing keys get defaults (draft / build / no acceptance) — a bare file is
 * a valid draft. A key that is PRESENT and wrong is a refusal: defaulting a
 * misspelled `mode:` would route the run somewhere the author did not ask.
 */
export function parseSpec(text: string): SpecParse {
	if (!text.startsWith("---")) return { ok: false, why: "missing frontmatter" };
	const end = text.indexOf("\n---", 3);
	if (end === -1) return { ok: false, why: "unterminated frontmatter" };
	const out: Record<string, string> = {};
	const acceptance: string[] = [];
	let inList = false;
	for (const line of text.slice(4, end).split("\n")) {
		if (line.trim() === "") continue;
		if (inList && /^\s+-\s/.test(line)) {
			acceptance.push(unquote(line.replace(/^\s+-\s*/, "")));
			continue;
		}
		inList = false;
		const m = /^([\w-]+):\s*(.*)$/.exec(line);
		if (!m) continue;
		if (m[1] === "acceptance") {
			inList = true;
			continue;
		}
		out[m[1] ?? ""] = unquote(m[2] ?? "");
	}
	const status = out.status ?? "draft";
	if (!(SPEC_STATUSES as readonly string[]).includes(status)) {
		return { ok: false, why: `unknown status "${status}"` };
	}
	const mode = out.mode ?? "build";
	if (!(SPEC_MODES as readonly string[]).includes(mode)) {
		return { ok: false, why: `unknown mode "${mode}"` };
	}
	const rest = text.slice(end + 4);
	return {
		ok: true,
		spec: {
			...(out.title !== undefined ? { title: out.title } : {}),
			status: status as SpecStatus,
			mode: mode as SpecMode,
			acceptance,
			body: rest.startsWith("\n") ? rest.slice(1) : rest,
		},
	};
}

/** The one edit the harness makes to a spec it did not author: the status
 * line, replaced in place so everything else stays byte-for-byte. */
export function withStatus(text: string, status: SpecStatus): string | null {
	if (!text.startsWith("---")) return null;
	const end = text.indexOf("\n---", 3);
	if (end === -1) return null;
	const head = text.slice(0, end);
	const next = /^status:/m.test(head)
		? head.replace(/^status:.*$/m, `status: ${status}`)
		: `${head}\nstatus: ${status}`;
	return next + text.slice(end);
}
