/**
 * The runner widget's and palette entries' pure half: label composition,
 * selection resolution, and the normalizers that keep the UI honest about
 * the scan shape the feature serves (inline meta or a nested `config` —
 * either reads the same here). No I/O, no React.
 */
import type { RunConfigShape, Scope } from "./form-model.js";

export interface ConfigMetaShape extends RunConfigShape {
	name: string;
	scope: Scope;
}

export interface SkippedShape {
	path: string;
	why: string;
}

const rec = (v: unknown): Record<string, unknown> =>
	typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

/** Tolerates both meta shapes: fields inline, or under a `config` key. */
export function normalizeMeta(raw: unknown): ConfigMetaShape {
	const m = rec(raw);
	const body = rec("config" in m ? m.config : m);
	return {
		...body,
		name: typeof m.name === "string" ? m.name : "",
		scope: m.scope === "global" ? "global" : "project",
	} as ConfigMetaShape;
}

export function normalizeScan(raw: unknown): { configs: ConfigMetaShape[]; skipped: SkippedShape[] } {
	const s = rec(raw);
	const configs = Array.isArray(s.configs) ? s.configs.map(normalizeMeta) : [];
	const skipped = (Array.isArray(s.skipped) ? s.skipped : []).map((k) => {
		const e = rec(k);
		return { path: String(e.path ?? ""), why: String(e.why ?? "unreadable") };
	});
	return { configs: configs.filter((c) => c.name !== ""), skipped };
}

/** A dry plan arrives as text, or wrapped; either way the pane shows words. */
export function normalizeDry(raw: unknown): string {
	if (typeof raw === "string") return raw;
	const r = rec(raw);
	if (typeof r.text === "string") return r.text;
	if (typeof r.why === "string") return r.why;
	return "";
}

/** getVerifyStatus → how many verify commands the repo has; null = unknown. */
export function verifyCommandCount(raw: unknown): number | null {
	if (Array.isArray(raw)) return raw.length;
	const r = rec(raw);
	if (Array.isArray(r.commands)) return r.commands.length;
	if (typeof r.count === "number") return r.count;
	return null;
}

/** The empty widget's copy, IntelliJ's own: short, imperative, ellipsized
 * because the action opens a dialog — never a log line in the toolbar. */
export const EMPTY_LABEL = "Add Configuration…";

/** Where the widget's per-machine selection lives — the flusk-theme precedent. */
export const SELECTION_KEY = "flusk-runconfig";

/** A stored selection that no longer exists falls back to the first config —
 * the widget never names a phantom. */
export function resolveSelection(stored: string | null, names: string[]): string | null {
	if (stored !== null && names.includes(stored)) return stored;
	return names[0] ?? null;
}

/** What the toolbar chip says: the selected config, or the honest empty state. */
export function widgetLabel(selected: string | null, names: string[]): string {
	if (names.length === 0) return EMPTY_LABEL;
	return resolveSelection(selected, names) ?? EMPTY_LABEL;
}

/** The `via <id>` marker (H0 D10), rendered as the RunnerWidget option text. */
export function optionLabel(c: { name: string; harness?: string }): string {
	return c.harness === undefined || c.harness === "" ? c.name : `${c.name} · via ${c.harness}`;
}

export interface PaletteCommand {
	label: string;
	/** The `rc` search value the command navigates to. */
	rc(stored: string | null): string;
}

const COMMANDS: PaletteCommand[] = [
	{ label: "Run configuration…", rc: (stored) => stored ?? "new" },
	{ label: "Edit configurations…", rc: (stored) => stored ?? "new" },
];

/** Two+ typed characters that appear in a label surface the command row. */
export function matchCommands(q: string): PaletteCommand[] {
	const needle = q.trim().toLowerCase();
	if (needle.length < 2) return [];
	return COMMANDS.filter((c) => c.label.toLowerCase().includes(needle));
}
