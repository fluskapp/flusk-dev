/**
 * The code viewer's structure strip rows. The strip states its own refusals:
 * it is filled when a file OPENS, before any symbol lookup, so it cannot
 * borrow that route's sentence — the server sends `note` and this prints it.
 * Rows are real controls: Tab reaches them, Enter/Space jumps.
 */
import type { OutlineReply } from "../../../features/projects/files.functions.js";
import { SkelOutline } from "../runs/skeleton.js";

interface Props {
	/** null while the outline is still on its way. */
	reply: OutlineReply | null;
	onGoto: (line: number) => void;
}

export function CodeOutline({ reply, onGoto }: Props) {
	if (reply === null) return <SkelOutline />;
	const items = reply.items;
	if (items.length === 0) {
		return (
			<div className="co-rows">
				<div className="co-empty">{reply.note ?? "no structure for this file"}</div>
			</div>
		);
	}
	return (
		<div className="co-rows">
			{items.map((it, i) => (
				<div
					key={i}
					className="co-row"
					data-gl={it.line}
					title={it.kind}
					tabIndex={0}
					role="button"
					// Depth is data; the indent it buys lives in the stylesheet.
					style={{ "--co-depth": it.depth || 0 } as React.CSSProperties}
					onClick={() => onGoto(it.line)}
					onKeyDown={(e) => {
						if (e.key !== "Enter" && e.key !== " ") return;
						e.preventDefault();
						onGoto(it.line);
					}}
				>
					<span className="glyph">{String(it.kind).slice(0, 4)}</span>
					{it.name}
				</div>
			))}
			{reply.truncated === true ? <div className="co-empty">first {items.length} shown</div> : null}
		</div>
	);
}
