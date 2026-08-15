/**
 * The hand-attached sources: a spec (title + body, per docs/experience.md
 * "Talk with spec") and a run's head. Each attach pushes a block or pushes a
 * note, never neither — an attachment that quietly does not happen is the bug
 * the old Ask card was built to prevent.
 */
import { getSpec } from "../../../features/specs/specs.functions.js";
import { getRunHead } from "../../../features/projects/runs.functions.js";
import type { AskBlock } from "../../../features/orchestra/ask.functions.js";
import { cwdPath } from "./attach-logic.js";
import { AT, repaint } from "./attach-store.js";

/**
 * Which repo a spec is read from: the code capture's project when there is
 * one, else the first configured project — specs.functions refuses anything
 * that is not a configured root, and its `skipped` row says so.
 */
export function specRepo(): string {
	return cwdPath() !== "" ? cwdPath() : (AT.projects?.[0]?.path ?? "");
}

/** Re-attaching replaces in place: same id, same spot, fresh text. */
function push(block: AskBlock): void {
	const i = AT.extras.findIndex((b) => b.id === block.id);
	if (i === -1) AT.extras.push(block);
	else AT.extras[i] = block;
	delete AT.off[block.id];
}

/** Attach one spec whole: its title and its body, fenced later like all data. */
export async function attachSpec(name: string): Promise<void> {
	try {
		const spec = await getSpec({ data: { repo: specRepo(), name } });
		if (spec === null) AT.notes.push(`spec "${name}" could not be read`);
		else push({ id: `spec:${spec.name}`, label: `spec ${spec.name}`, text: `${spec.title}\n\n${spec.body}` });
	} catch (e) {
		AT.notes.push(`spec "${name}" unavailable: ${e instanceof Error ? e.message : String(e)}`);
	}
	repaint();
}

/** Attach a run's head: what it was asked, and what the harness observed. */
export async function attachRun(key: string): Promise<void> {
	try {
		const head = await getRunHead({ data: { key } });
		const s = head.summary;
		if (s === null) {
			AT.notes.push(`run "${key}" was not found`);
		} else {
			const text = [
				s.task,
				`status: ${s.status} · ${s.turns} turns · $${s.costUsd.toFixed(2)}`,
				`model: ${s.model.provider}/${s.model.id}`,
				`repo: ${s.repoRoot}`,
				`created: ${s.createdAt}`,
			].join("\n");
			push({ id: `run:${s.key}`, label: `run ${s.key}`, text });
		}
	} catch (e) {
		AT.notes.push(`run "${key}" unavailable: ${e instanceof Error ? e.message : String(e)}`);
	}
	repaint();
}
