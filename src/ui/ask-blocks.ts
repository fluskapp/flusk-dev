/**
 * The three attachable blocks, formatted for a model to read: the symbol, the
 * source span, and the blast radius.
 *
 * Split from ask-context.ts, which decides WHICH of them exist; this file
 * decides what each one SAYS. The formatting is plain text on purpose — it is
 * shown verbatim in the panel and fenced verbatim into the prompt, so any
 * markup here would be a second thing to keep in step.
 *
 * Each helper pushes a block or pushes a note, never neither: an attachment
 * that quietly does not happen is the bug this panel was built to prevent.
 */
import type { SymbolDoc } from "../doc/types.js";
import { blastBlock } from "./ask-blast.js";
import { readSpan } from "./ask-span.js";
import type { AskContext } from "./ask-types.js";

/** Signature, prose, tags and where it is used — the Documentation window, as text. */
export function symbolText(file: string, doc: SymbolDoc): string {
	const where = doc.defined === null ? file : `${doc.defined.file}:${doc.defined.line}`;
	const tags = doc.tags.map((t) => `@${t.name} ${t.text}`).join("\n");
	const uses =
		doc.referenceCount === 0
			? "no references found"
			: `${doc.referenceCount} reference${doc.referenceCount === 1 ? "" : "s"}` +
				`${doc.truncated === true ? " (list capped)" : ""}: ` +
				doc.references.map((r) => `${r.file}:${r.line}`).join(", ");
	return [`${doc.name} — ${doc.kind}`, where, doc.signature, doc.docs, tags, uses]
		.filter((part) => part !== "")
		.join("\n\n");
}

/**
 * The declaration when the engine gave one, otherwise a window on the caret.
 * The label carries the real line numbers, so a cited line is the file's own.
 */
export async function addSpan(
	out: AskContext,
	file: string,
	doc: SymbolDoc | null,
	line: number,
): Promise<void> {
	const at = doc?.defined?.file === file ? doc.defined : null;
	const span = await readSpan({
		file,
		line: at?.line ?? Math.max(line, 1),
		...(at?.endLine === undefined ? {} : { endLine: at.endLine }),
	});
	if (span === null) {
		out.notes.push("the file could not be read here, so no source span is attached");
		return;
	}
	const cut = span.truncated ? " (cut)" : "";
	out.blocks.push({
		id: "span",
		label: `${file} lines ${span.from}–${span.to}${cut}`,
		text: span.text,
	});
}

/** Inbound impact for the symbol when there is one, else for the file. */
export async function addBlast(
	out: AskContext,
	root: string,
	file: string,
	doc: SymbolDoc | null,
): Promise<void> {
	const symbol =
		doc !== null && doc.defined !== null
			? { name: doc.name, definedFile: doc.defined.file }
			: undefined;
	const blast = await blastBlock({ root, file, ...(symbol === undefined ? {} : { symbol }) });
	if (blast.text !== null) {
		out.blocks.push({ id: "blast", label: "blast radius", text: blast.text });
	}
	if (blast.note !== undefined) out.notes.push(blast.note);
}
