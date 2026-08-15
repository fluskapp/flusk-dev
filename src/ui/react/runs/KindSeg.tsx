/**
 * The feed's [All | Sessions | Journals | Flows] segment — the same IntelliJ
 * SegmentedButton the markdown surface carries (docs/MdSurface.tsx), pointed
 * at ?kind= instead of a localStorage mode: the chosen segment is a link, so
 * every narrowed feed can be shared. Picking a segment also closes any open
 * flow detail — a filter that keeps showing one run would be lying.
 */
import { FEED_KINDS, FEED_LABEL, type FeedKind } from "./feed-row.js";
import { useOpenSearch } from "./widgets.js";
import "./seg.css";

export function KindSeg({ kind }: { kind: FeedKind }) {
	const open = useOpenSearch();
	return (
		<div className="seg head-seg" role="group" aria-label="Run kind">
			{FEED_KINDS.map((k) => (
				<button
					key={k}
					type="button"
					data-kind={k}
					aria-pressed={k === kind}
					className={k === kind ? "on" : undefined}
					onClick={() => open({ kind: k === "all" ? undefined : k, flow: undefined })}
				>
					{FEED_LABEL[k]}
				</button>
			))}
		</div>
	);
}
