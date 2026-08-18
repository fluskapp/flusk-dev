/**
 * Reads <repo>/.flusk/workbench.json — committable team defaults. Absent is a
 * choice and costs nothing; a malformed file or an unknown key becomes a note
 * for the resolved view, never a refusal: a newer flusk must open an older
 * repo, and an older flusk a newer one (H0 D6).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WORKBENCH_FILE, type WorkbenchFile } from "./workbench.types.js";

export interface WorkbenchRead {
	file: WorkbenchFile;
	notes: string[];
}

export function readWorkbenchFile(repoRoot: string): WorkbenchRead {
	const path = join(repoRoot, WORKBENCH_FILE);
	let raw: string;
	try {
		raw = readFileSync(path, "utf8");
	} catch {
		return { file: {}, notes: [] };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		return { file: {}, notes: [`${path}: malformed JSON ignored (${detail})`] };
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return { file: {}, notes: [`${path}: expected a JSON object — ignored`] };
	}
	const file: WorkbenchFile = {};
	const notes: string[] = [];
	for (const [key, value] of Object.entries(parsed)) {
		if (key === "defaultRunConfig") {
			if (typeof value === "string") file.defaultRunConfig = value;
			else notes.push(`${path}: defaultRunConfig is not a string — ignored`);
		} else {
			notes.push(`${path}: unknown key "${key}" ignored`);
		}
	}
	return { file, notes };
}
