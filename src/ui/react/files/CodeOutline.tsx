/**
 * The code viewer's structure strip rows. The strip states its own refusals:
 * it is filled when a file OPENS, before any symbol lookup, so it cannot
 * borrow that route's sentence — the server sends `note` and this prints it.
 */
import type { OutlineReply } from "../../../features/projects/files.functions.js";

interface Props {
	/** null while the outline is still on its way. */
	reply: OutlineReply | null;
	onGoto: (line: number) => void;
}

export function CodeOutline({ reply, onGoto }: Props) {
	const items = reply?.items ?? [];
	if (items.length === 0) {
		return (
			<div className="co-rows">
				<div className="co-empty">
					{reply === null ? "…" : (reply.note ?? "no structure for this file")}
				</div>
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
					style={{ paddingLeft: 6 + (it.depth || 0) * 12 }}
					onClick={() => onGoto(it.line)}
				>
					<span className="glyph">{String(it.kind).slice(0, 4)}</span>
					{it.name}
				</div>
			))}
			{reply?.truncated === true ? <div className="co-empty">first {items.length} shown</div> : null}
		</div>
	);
}
