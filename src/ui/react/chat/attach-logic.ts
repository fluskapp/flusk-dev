/**
 * The attachment strip's capture and counting, migrated from ask-logic.ts. A
 * failed request is not an empty list: "no answerer available" is a claim
 * about this machine's configuration, a failed call is a different fact with
 * a different remedy.
 */
import type { AskBlock } from "../../../features/orchestra/ask.functions.js";
import {
	getAnswerers,
	getAskContext,
} from "../../../features/orchestra/ask.functions.js";
import { getProjects } from "../../../features/projects/projects.functions.js";
import { AT, repaint } from "./attach-store.js";
import { pickWho, whoRow } from "./attach-who.js";

/** Every block on screen: the code capture's, then the hand-attached ones. */
export function allBlocks(): AskBlock[] {
	return (AT.ctx?.blocks ?? []).concat(AT.extras);
}

/** The capture's reasons first, then the hand-attach failures — all of them. */
export function allNotes(): string[] {
	return (AT.ctx?.notes ?? []).concat(AT.notes);
}

/** Blocks still switched on, in the order they are shown. */
export function onBlocks(): AskBlock[] {
	return allBlocks().filter((b) => AT.off[b.id] !== true);
}

export function attachBytes(n: number): string {
	return n < 1024 ? `${n} B` : `${Math.round(n / 102.4) / 10} KB`;
}

/** The selected agent's own prompt — part of what the model receives, so the
 * strip counts it and prints it, before the request is dispatched. */
export function preambleText(): string {
	return (whoRow()?.preamble ?? "").trim();
}

/** The one line that says how big the attached material is about to be. */
export function countText(): string {
	const on = onBlocks();
	const head = preambleText();
	const size = on.reduce((sum, b) => sum + b.text.length, 0);
	const n = on.length + (head !== "" ? 1 : 0);
	return n === 0 ? "nothing attached" : `${n}${n === 1 ? " block · " : " blocks · "}${attachBytes(size + head.length)}`;
}

/** The project the talk is about, so a CLI answerer runs in the right tree. */
export function cwdPath(): string {
	const name = AT.ctx?.project ?? null;
	return (AT.projects ?? []).find((p) => p.name === name)?.path ?? "";
}

/**
 * The state is SET from the checkbox, never flipped: the browser has already
 * flipped the box by the time this runs.
 */
export function toggleBlock(id: string, checked: boolean): void {
	AT.off[id] = !checked;
	repaint();
}

export async function loadAnswerers(): Promise<void> {
	if (AT.projects === null) {
		try {
			AT.projects = await getProjects();
		} catch {
			AT.projects = [];
		}
	}
	const cwd = cwdPath();
	try {
		AT.answerers = await getAnswerers({ data: cwd === "" ? {} : { repo: cwd } });
		AT.whoErr = "";
	} catch (e) {
		AT.answerers = [];
		AT.whoErr = `answerer list unavailable: ${e instanceof Error ? e.message : String(e)}`;
	}
	pickWho();
	repaint();
}

/**
 * Re-read the screen. The code capture's exclusions are cleared with it: they
 * were choices about the OLD symbol, and silently carrying "no blast radius"
 * onto the next question is exactly the invisible edit the strip refuses to
 * make. Hand-attached blocks (specs, runs) keep their switches — they did not
 * change.
 */
export async function captureCode(): Promise<void> {
	const on = AT.screen;
	AT.loading = true;
	for (const b of AT.ctx?.blocks ?? []) delete AT.off[b.id];
	AT.notes = AT.notes.filter((n) => !n.startsWith("context unavailable"));
	repaint();
	try {
		AT.ctx = await getAskContext({
			data: { ...(on.file === "" ? {} : { file: on.file }), line: on.line, col: on.col },
		});
	} catch (e) {
		AT.ctx = null;
		AT.notes.push(`context unavailable: ${e instanceof Error ? e.message : String(e)}`);
	}
	AT.loading = false;
	repaint();
	await loadAnswerers();
}
