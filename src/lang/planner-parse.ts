/**
 * Reading follow-up steps out of a plan step's own words.
 *
 * This is model text, so the parser is defensive BY DESIGN: junk yields no
 * steps and the run continues on the library flow instead of failing. JSON is
 * preferred — a plan that wants to grow the graph can be asked for it — and the
 * line form is deliberately narrow, because a parser loose enough to read prose
 * grows the graph out of sentences that were never a declaration.
 *
 * A declared step is a KIND and a phrase. A plan cannot hand a later step a
 * prompt, only a job.
 */
import { phrase } from "./context.js";
import type { FlowNode, NodeKind } from "./types.js";

/** Kinds a plan may add. "flow" is excluded: nesting is an authored decision. */
const ADDABLE: NodeKind[] = ["plan", "code", "review", "verify", "summarize"];

const one = (raw: Record<string, unknown>, ...keys: string[]): string => {
	for (const k of keys) if (typeof raw[k] === "string") return raw[k] as string;
	return "";
};

function toNode(value: unknown): FlowNode | null {
	if (typeof value !== "object" || value === null) return null;
	const raw = value as Record<string, unknown>;
	const kind = one(raw, "kind", "step", "type").trim().toLowerCase() as NodeKind;
	if (!ADDABLE.includes(kind)) return null;
	const about = phrase(one(raw, "about", "job", "goal", "task", "description"));
	return { id: kind, kind, ...(about === "" ? {} : { about }) };
}

/** JSON the plan may have emitted: fenced, bare, or embedded in prose. */
function fromJson(text: string): FlowNode[] {
	const candidates = [
		/```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1],
		/(\[[\s\S]*\]|\{[\s\S]*\})/.exec(text)?.[1],
	];
	for (const candidate of candidates) {
		if (candidate === undefined) continue;
		try {
			const parsed: unknown = JSON.parse(candidate);
			const list = Array.isArray(parsed) ? parsed : (parsed as { steps?: unknown }).steps;
			if (!Array.isArray(list)) continue;
			const nodes = list.map(toNode).filter((n): n is FlowNode => n !== null);
			if (nodes.length > 0) return nodes;
		} catch {
			// Model text is not required to be JSON; the line form is tried next.
		}
	}
	return [];
}

/**
 * `- code: make the tests pass`. A LIST MARKER is required and so is a second
 * matching line, because ordinary plan prose opens sentences with these words:
 * "Plan: add a retry helper" grew the graph a duplicate plan node, and "Review:
 * the uploader throws on a 500." injected a review step. A plan that means to
 * declare steps writes a list; one that does not, does not.
 */
const LINE = /^[-*\d]+[.)]?\s+(?:step\s*)?(plan|code|review|verify|summarize)\s*[:—–-]\s*(\S.*)$/i;

/** At least this many list lines before model prose counts as a step list. */
const MIN_LINES = 2;

function fromLines(text: string): FlowNode[] {
	const out: FlowNode[] = [];
	for (const line of text.split("\n")) {
		const m = LINE.exec(line.trim());
		if (m === null) continue;
		const kind = (m[1] ?? "").toLowerCase() as NodeKind;
		out.push({ id: kind, kind, about: phrase(m[2] ?? "") });
	}
	return out.length >= MIN_LINES ? out : [];
}

/** Follow-up steps a plan declared. Anything unparseable yields none. */
export function followUps(text: string): FlowNode[] {
	const found = fromJson(text);
	return found.length > 0 ? found : fromLines(text);
}
