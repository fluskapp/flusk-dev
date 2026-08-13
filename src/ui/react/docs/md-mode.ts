/**
 * The [Preview | Split | Raw] mode memory, per tab, in localStorage — a
 * journal you read raw stays raw and a doc stays rendered (client-md.ts).
 * Preview is the DEFAULT: a .md file opens as a document, never as YAML
 * frontmatter followed by asterisks.
 */
export const MD_MODES = ["preview", "split", "raw"] as const;
export type MdMode = (typeof MD_MODES)[number];
export const MD_LABEL: Record<MdMode, string> = { preview: "Preview", split: "Split", raw: "Raw" };
const MD_KEY = "flusk-md-mode";

function mdModes(): Record<string, string> {
	try {
		return (JSON.parse(localStorage.getItem(MD_KEY) ?? "{}") as Record<string, string>) ?? {};
	} catch {
		return {};
	}
}

export function mdMode(id: string): MdMode {
	const m = mdModes()[id];
	return (MD_MODES as readonly string[]).includes(m ?? "") ? (m as MdMode) : "preview";
}

export function setMdMode(id: string, mode: MdMode): void {
	const all = mdModes();
	all[id] = mode;
	try {
		localStorage.setItem(MD_KEY, JSON.stringify(all));
	} catch {
		/* private mode */
	}
}
