/**
 * A run journal's frontmatter, parsed by hand: the shape is fixed (scalar
 * keys plus one nested `stages:` block) and ah takes no YAML dependency.
 *
 * Split from journal-scan.ts, which is now only about *finding* journals.
 */

export interface JournalStage {
	name: string;
	status: string;
	duration: string;
	detail: string;
}

/** Everything a journal file itself declares. */
export interface JournalMeta {
	title: string;
	date: string;
	status: string;
	kind?: string;
	tool?: string;
	pr?: string;
	/** `cost:`/`usd:` frontmatter, in dollars, when the harness records one. */
	costUsd?: number;
	stages: JournalStage[];
}

function unquote(v: string): string {
	const t = v.trim();
	return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

/** `"done|4.7s|review · tools: claude"` → structured stage. */
function parseStage(name: string, raw: string): JournalStage {
	const [status = "", duration = "", ...rest] = unquote(raw).split("|");
	return { name, status, duration, detail: rest.join("|") };
}

/** `cost: 0.42` or `usd: "$0.42"` → 0.42; anything unparseable → undefined. */
function parseCost(out: Record<string, string>): number | undefined {
	const raw = out.cost ?? out.usd ?? out.costUsd ?? "";
	const n = Number(raw.replace(/^\$/, "").trim());
	return raw !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseFrontmatter(text: string): JournalMeta | null {
	if (!text.startsWith("---")) return null;
	const end = text.indexOf("\n---", 3);
	if (end === -1) return null;
	const out: Record<string, string> = {};
	const stages: JournalStage[] = [];
	let inStages = false;
	for (const line of text.slice(4, end).split("\n")) {
		if (line.trim() === "") continue;
		if (/^\s{2,}\S/.test(line) && inStages) {
			const m = /^\s+([\w-]+):\s*(.*)$/.exec(line);
			if (m) stages.push(parseStage(m[1] ?? "", m[2] ?? ""));
			continue;
		}
		inStages = false;
		const m = /^([\w-]+):\s*(.*)$/.exec(line);
		if (!m) continue;
		if (m[1] === "stages") {
			inStages = true;
			continue;
		}
		out[m[1] ?? ""] = unquote(m[2] ?? "");
	}
	const costUsd = parseCost(out);
	return {
		title: out.title ?? "(untitled)",
		date: out.date ?? "",
		status: out.status ?? "unknown",
		...(out.kind !== undefined ? { kind: out.kind } : {}),
		...(out.tool !== undefined ? { tool: out.tool } : {}),
		...(out.pr !== undefined ? { pr: out.pr } : {}),
		...(costUsd !== undefined ? { costUsd } : {}),
		stages,
	};
}
