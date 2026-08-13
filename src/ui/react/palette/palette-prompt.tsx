/**
 * The compose half of the palette: the prompt as a list of blocks you can
 * untick, and the commit card behind a history row. A token budget spent in
 * the open is the whole point — every block shows its source, its one-line
 * justification and its cost before it is copied.
 */
import { DOT, type ComposedPrompt, type HistoryHit } from "./palette-state.js";

/** The commit card itself, read-only: the evidence behind the row. */
export function CardView({ h }: { h: HistoryHit }) {
	return (
		<div className="pal-block">
			<label>
				<b>{h.card.title}</b>
				<span className="why">{h.card.project + DOT + h.card.at.slice(0, 10)}</span>
				<span className="pal-meta">{h.card.ref.slice(0, 8)}</span>
			</label>
			<pre>{h.card.text}</pre>
		</div>
	);
}

interface PromptProps {
	prompt: ComposedPrompt;
	off: Record<number, boolean>;
	onToggle: (i: number) => void;
}

export function PromptView({ prompt, off, onToggle }: PromptProps) {
	return (
		<>
			{prompt.blocks.map((b, i) => (
				<div key={i} className={`pal-block${off[i] === true ? " pal-off" : ""}`}>
					<label>
						<input
							type="checkbox"
							data-b={i}
							checked={off[i] !== true}
							onChange={() => onToggle(i)}
						/>
						<b>{b.source}</b>
						<span className="why">{b.why}</span>
						<span className="pal-meta">{b.tokens}t</span>
					</label>
					<pre>{b.text.slice(0, 400)}</pre>
				</div>
			))}
			{prompt.constraints.map((c, i) => (
				<div key={`c${i}`} className="pal-con">
					{c}
				</div>
			))}
		</>
	);
}
