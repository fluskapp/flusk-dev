/**
 * LLM lesson extraction: one non-tool stream call over the transcript tail,
 * prompted with the predicate vocabulary, parsed defensively. Anything the
 * model gets wrong (garbage text, stray predicates, wild confidences) is
 * dropped or clamped — the extractor returns [] rather than throwing.
 */
import type { ModelRef, Msg, TextBlock } from "../core/types.js";
import type { Provider } from "../provider/provider.js";
import type { MemFactInput } from "./client-types.js";
import type { Extractor } from "./digestion.js";
import { isVocabularyPredicate, vocabularyRows } from "./facts.js";
import type { RunRecord } from "./port.js";

const MAX_CONFIDENCE = 0.7;
const TAIL_CHARS = 8000;

function system(): string {
	return [
		"Extract durable lessons from this coding-agent transcript as a JSON array of",
		'{"subject", "predicate", "object", "confidence"} rows (confidence <= 0.7).',
		"Subjects are typed like Tool:vitest or ErrorClass:enoent. Use ONLY these",
		"(subject type, predicate) pairs:",
		vocabularyRows().join(", "),
		"Output the JSON array only. Output [] when there is nothing worth keeping.",
	].join("\n");
}

function renderTail(msgs: Msg[]): string {
	const lines = msgs.map((m) => {
		if (m.role === "user") return `user: ${m.content}`;
		if (m.role === "toolResult") return `tool ${m.name}${m.isError ? " (error)" : ""}: ${m.output}`;
		return `assistant: ${m.content.map((b) => (b.type === "toolCall" ? `[${b.name}]` : b.text)).join(" ")}`;
	});
	return lines.join("\n").slice(-TAIL_CHARS);
}

function toFact(row: unknown): MemFactInput | null {
	if (typeof row !== "object" || row === null) return null;
	const r = row as Record<string, unknown>;
	if (
		typeof r.subject !== "string" ||
		typeof r.predicate !== "string" ||
		typeof r.object !== "string"
	) {
		return null;
	}
	if (!isVocabularyPredicate(r.subject.split(":", 1)[0] ?? "", r.predicate)) return null;
	const raw = typeof r.confidence === "number" ? r.confidence : MAX_CONFIDENCE;
	const confidence = Math.min(Math.max(raw, 0.1), MAX_CONFIDENCE);
	return { subject: r.subject, predicate: r.predicate, object: r.object, confidence };
}

/** Slice first "[" to last "]" and parse; anything unparseable becomes []. */
export function parseExtraction(text: string): MemFactInput[] {
	const start = text.indexOf("[");
	const end = text.lastIndexOf("]");
	if (start === -1 || end <= start) return [];
	let rows: unknown;
	try {
		rows = JSON.parse(text.slice(start, end + 1));
	} catch {
		return [];
	}
	if (!Array.isArray(rows)) return [];
	return rows.map(toFact).filter((f): f is MemFactInput => f !== null);
}

export function makeExtractor(provider: Provider, model: ModelRef): Extractor {
	return async (run: RunRecord) => {
		const req = {
			model,
			system: system(),
			messages: [{ role: "user" as const, content: renderTail(run.transcriptTail) }],
			tools: [],
		};
		let text = "";
		for await (const ev of provider.stream(req, new AbortController().signal)) {
			if (ev.type !== "done") continue;
			if (ev.message.stopReason === "error" || ev.message.stopReason === "aborted") return [];
			text = ev.message.content
				.filter((b): b is TextBlock => b.type === "text")
				.map((b) => b.text)
				.join("");
		}
		return parseExtraction(text);
	};
}
