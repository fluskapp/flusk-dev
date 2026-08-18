/**
 * The dry plan pane: what `flusk run --dry` would print for this config —
 * kind, model, toolbelt, isolation plan, the exact system prompt. A glance
 * during editing, not a document to keep: it swaps in over the form and one
 * Escape (or the button) brings the form back.
 */
export function DryPreview({ text, onBack }: { text: string; onBack: () => void }) {
	return (
		<div className="rc-dry">
			<div className="rc-dry-head">
				<span className="rc-group">Dry preview</span>
				<span className="spacer" />
				<button type="button" className="sys-btn" onClick={onBack}>
					Back to form
				</button>
			</div>
			<pre className="rc-pre">{text === "" ? "The dry run produced no plan text." : text}</pre>
		</div>
	);
}
