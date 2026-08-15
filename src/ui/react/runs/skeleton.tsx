/**
 * Deferred-payload placeholders: dim shimmer bars at the density of the
 * content each replaces — a transcript keeps its tag gutter, code keeps its
 * line pitch — so nothing jumps when the real body lands.
 */
import "./skeleton.css";

/* Width steps cycle so the block reads as ragged content, not a slab. */
const W = ["w6", "w9", "w8", "w5", "w7", "w4"];

const bars = (n: number, from = 0) =>
	Array.from({ length: n }, (_, i) => <div key={i} className={`skel ${W[(from + i) % W.length]}`} />);

/** Prose density: a journal or document body on its way. */
export function SkelText({ rows = 6 }: { rows?: number }) {
	return (
		<div className="skel-block" aria-hidden="true">
			{bars(rows)}
		</div>
	);
}

/** Transcript density: a tag stub in the gutter beside each turn's lines. */
export function SkelTranscript() {
	return (
		<div className="skel-tx" aria-hidden="true">
			{[2, 1, 4, 2, 3].map((n, i) => (
				<div key={i} className="skel-msg">
					<div className="skel skel-tag" />
					<div className="skel-body">{bars(n, i)}</div>
				</div>
			))}
		</div>
	);
}

/** Editor density: gutter stubs beside code-length bars at the line pitch. */
export function SkelCode({ rows = 18 }: { rows?: number }) {
	return (
		<div className="skel-code" aria-hidden="true">
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} className="skel-line">
					<div className="skel skel-num" />
					<div className={`skel ${W[i % W.length]}`} />
				</div>
			))}
		</div>
	);
}

/** Structure-strip density: short rows, one per symbol it stands in for. */
export function SkelOutline({ rows = 7 }: { rows?: number }) {
	return (
		<div className="skel-outline" aria-hidden="true">
			{bars(rows, 3)}
		</div>
	);
}
