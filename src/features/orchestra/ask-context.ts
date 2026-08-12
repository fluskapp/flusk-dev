/**
 * "What is on screen", assembled server-side into the blocks the panel shows
 * and then sends. This is the module that means the user never pastes context.
 *
 * It reuses the documentation lookup (`engineFor` + `docAt`) rather than
 * asking the client to forward what the Documentation window happened to be
 * holding: the panel can then be opened from a file tab, a Find hit, or a
 * keystroke with no doc window open at all, and still attach the same thing.
 *
 * Every half is OPTIONAL and every absence is a sentence. A file with no
 * language service still attaches its span; a project with no graph still
 * attaches the symbol; and the panel prints why the missing block is missing,
 * because a silently thinner prompt is the failure mode this whole feature
 * exists to remove.
 *
 * The block bodies live in ask-blocks.ts; this file decides which exist.
 */
import type { FluskConfig } from "../../platform/config/types.js";
import type { SymbolDoc } from "../docs/types.js";
import { searchRoots } from "../search/files.js";
import { engineFor } from "../docs/doc-engines.js";
import { indexedFile } from "../docs/doc-util.js";
import { addBlast, addSpan, symbolText } from "./ask-blocks.js";
import type { AskContext } from "./ask.types.js";

export interface ContextRequest {
	file: string | null;
	/** 1-based; 0 or absent means "no caret", which still attaches a span. */
	line: number;
	col: number;
}

const empty = (notes: string[]): AskContext => ({
	file: null,
	symbol: null,
	project: null,
	blocks: [],
	notes,
});

export async function assembleContext(cfg: FluskConfig, req: ContextRequest): Promise<AskContext> {
	const file = await indexedFile(cfg, req.file);
	if (file === null) {
		return empty([
			"Nothing is open that flusk has indexed. Open a source file — the project tree, " +
				"⌘⇧O, or a Find in Files hit — and ask again.",
		]);
	}
	const root = searchRoots(cfg).find((r) => file.startsWith(`${r.path}/`));
	const out: AskContext = {
		file,
		symbol: null,
		project: root?.project ?? null,
		blocks: [],
		notes: [],
	};
	const doc = await symbolAt(cfg, file, req, out.notes);
	if (doc !== null) {
		out.symbol = doc.name;
		out.blocks.push({ id: "symbol", label: `symbol ${doc.name}`, text: symbolText(file, doc) });
	}
	await addSpan(out, file, doc, req.line);
	if (root !== undefined) await addBlast(out, root.path, file, doc);
	else out.notes.push("this file is not inside a configured project, so no blast radius");
	return out;
}

/** The lookup, or the reason there is none. Never throws — the panel is one call. */
async function symbolAt(
	cfg: FluskConfig,
	file: string,
	req: ContextRequest,
	notes: string[],
): Promise<SymbolDoc | null> {
	if (req.line < 1 || req.col < 1) {
		notes.push("no symbol was selected, so only the file span is attached");
		return null;
	}
	try {
		const choice = await engineFor(cfg, file);
		if (choice.provider === null) {
			notes.push(choice.reason ?? "no documentation engine for this file");
			return null;
		}
		const doc = await choice.provider.docAt(file, req.line, req.col);
		if (doc === null) notes.push("no symbol at the selected position");
		return doc;
	} catch (e) {
		notes.push(`symbol lookup failed: ${e instanceof Error ? e.message : String(e)}`);
		return null;
	}
}
