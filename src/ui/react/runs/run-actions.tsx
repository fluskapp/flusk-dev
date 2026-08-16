/**
 * Copy path / copy nvim command / reveal, for any view holding a file path
 * (client-run.ts's pathActions). Reveal is offered everywhere, not only on
 * run transcripts: a journal or a document is a file on disk, and "where IS
 * this" used to mean copying the path into a terminal by hand.
 */
import { revealRef } from "../../../features/projects/runs.functions.js";
import { copyText } from "./widgets.js";
import { Ic } from "../system/Icon.js";

/** `nvim "path"`. The legacy tab system could carry a line (+N); the routed
 * workbench has no tab state, so the command names the file alone. */
const nvimCmd = (path: string): string => `nvim "${path}"`;

export interface PathActionsProps {
	path: string;
	/** A run transcript reveals by session KEY; files reveal by path. */
	revealKey?: string;
	toast: (msg: string) => void;
}

export function PathActions({ path, revealKey, toast }: PathActionsProps) {
	const reveal = async () => {
		const body = revealKey !== undefined ? { key: revealKey } : { path };
		try {
			const r = await revealRef({ data: body });
			toast(r.ok ? "Revealed in Finder" : (r.error ?? "Reveal failed"));
		} catch {
			toast("Reveal failed");
		}
	};
	return (
		<>
			<button
				type="button"
				className="sys-btn icon"
				title="Copy path"
				onClick={() => copyText(path, toast, "Path copied")}
			>
				<Ic name="copy" size={14} />
			</button>
			<button
				type="button"
				className="sys-btn icon"
				title="Copy nvim command"
				onClick={() => copyText(nvimCmd(path), toast, "Command copied")}
			>
				<Ic name="terminal" size={14} />
			</button>
			<button type="button" className="sys-btn icon" title="Reveal in Finder" onClick={reveal}>
				<Ic name="folder" size={14} />
			</button>
		</>
	);
}
