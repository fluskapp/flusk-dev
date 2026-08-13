/**
 * The editor bar over a file body: name, full path, and the path actions.
 * "Copy nvim command" keeps the line — the one thing the search hit knew;
 * dropping it would throw away the point. Reveal in Finder is the run
 * window's server surface and is not duplicated here.
 */
import { base } from "./path-bits.js";

function copy(text: string): void {
	void navigator.clipboard?.writeText(text).catch(() => {});
}

export function EdBar({ path, line }: { path: string; line?: number }) {
	const nvim = `nvim ${line !== undefined && line > 0 ? `+${line} ` : ""}"${path}"`;
	return (
		<div className="ed-bar">
			<b>{base(path)}</b>
			<span className="path">{path}</span>
			<div className="meta-actions">
				<button className="act" onClick={() => copy(path)}>
					Copy path
				</button>
				<button className="act" onClick={() => copy(nvim)}>
					Copy nvim command
				</button>
			</div>
		</div>
	);
}
