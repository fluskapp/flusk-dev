/**
 * The Ask panel's capture and picker loading, ported from
 * client-ask-context.ts / client-ask-who.ts. A failed request is not an empty
 * list: "no answerer available" is a claim about this machine's configuration,
 * a failed call is a different fact with a different remedy.
 */
import {
	getAnswerers,
	getAskContext,
} from "../../../features/orchestra/ask.functions.js";
import { getProjects } from "../../../features/projects/projects.functions.js";
import { A, repaint } from "./ask-store.js";
import { askPickWho, askWho } from "./ask-who.js";

/** Blocks still switched on, in the order they are shown. */
export function askBlocks(): { id: string; label: string; text: string }[] {
	return (A.ctx?.blocks ?? []).filter((b) => A.off[b.id] !== true);
}

export function askBytes(n: number): string {
	return n < 1024 ? `${n} B` : `${Math.round(n / 102.4) / 10} KB`;
}

/** The selected agent's own prompt — part of what the model receives, so the
 * panel counts it and prints it, before the request is dispatched. */
export function askPreamble(): string {
	return (askWho()?.preamble ?? "").trim();
}

/** The one line that says how big the prompt is about to be. */
export function askCountText(): string {
	const on = askBlocks();
	const head = askPreamble();
	const size = on.reduce((sum, b) => sum + b.text.length, 0);
	const n = on.length + (head !== "" ? 1 : 0);
	return n === 0 ? "nothing attached" : `${n}${n === 1 ? " block · " : " blocks · "}${askBytes(size + head.length)}`;
}

/** The project the question is about, so a CLI answerer runs in the right tree. */
export function askCwd(): string {
	const name = A.ctx?.project ?? null;
	return (A.projects ?? []).find((p) => p.name === name)?.path ?? "";
}

/**
 * The state is SET from the checkbox, never flipped: the browser has already
 * flipped the box by the time this runs.
 */
export function askToggleBlock(id: string, checked: boolean): void {
	A.off[id] = !checked;
	repaint();
}

export async function askLoadAnswerers(): Promise<void> {
	if (A.projects === null) {
		try {
			A.projects = await getProjects();
		} catch {
			A.projects = [];
		}
	}
	const cwd = askCwd();
	try {
		A.answerers = await getAnswerers({ data: cwd === "" ? {} : { repo: cwd } });
		A.whoErr = "";
	} catch (e) {
		A.answerers = [];
		A.whoErr = `answerer list unavailable: ${e instanceof Error ? e.message : String(e)}`;
	}
	askPickWho();
	repaint();
}

/**
 * Re-read the screen. The exclusions are cleared with it: they were choices
 * about the OLD symbol, and silently carrying "no blast radius" onto the next
 * question is exactly the invisible edit this panel refuses to make.
 */
export async function askCapture(): Promise<void> {
	const on = A.screen;
	A.loading = true;
	A.err = "";
	A.off = {};
	repaint();
	try {
		A.ctx = await getAskContext({
			data: { ...(on.file === "" ? {} : { file: on.file }), line: on.line, col: on.col },
		});
		A.notes = A.ctx.notes;
	} catch (e) {
		A.ctx = null;
		A.notes = [];
		A.err = `context unavailable: ${e instanceof Error ? e.message : String(e)}`;
	}
	A.loading = false;
	repaint();
	await askLoadAnswerers();
}
